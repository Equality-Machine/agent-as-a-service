import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { decryptSourceCapsule } from "./capsule.mjs";
import { CloudClient } from "./cloud-client.mjs";
import { CloudState } from "./cloud-state.mjs";
import { ClaudeRuntime } from "./runtimes/claude.mjs";
import { CodexRuntime } from "./runtimes/codex.mjs";
import { fingerprintFile } from "./runtimes/fingerprint.mjs";

const delay = (milliseconds, signal) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

export class CloudRunner {
  constructor({
    dataDir,
    cloudUrl,
    runtimes = null,
    pollMs = 1_000,
    cloudClient = null,
  }) {
    this.state = new CloudState(dataDir);
    this.cloud = cloudClient ?? new CloudClient({ baseUrl: cloudUrl });
    this.pollMs = pollMs;
    this.runtimes =
      runtimes ??
      {
        codex: new CodexRuntime({
          executable:
            process.env.AAAS_CODEX_BIN ??
            "/Applications/ChatGPT.app/Contents/Resources/codex",
        }),
        claude: new ClaudeRuntime({
          executable: process.env.AAAS_CLAUDE_BIN ?? "claude",
          allowedTools:
            process.env.AAAS_CLAUDE_ALLOWED_TOOLS ?? "Read,Grep,Glob",
        }),
      };
  }

  async runOnce() {
    await this.state.reload();
    const runner = await this.state.getRunner();
    if (!runner) return { status: "unconfigured" };
    const payload = await this.cloud.nextJob(runner.id, runner.token);
    if (!payload?.job) return { status: "idle" };
    const job = payload.job;
    try {
      let source = await this.state.getSource(job.sourceHandle);
      if (!source && job.capsuleAvailable) {
        source = await this.installCapsule(job, runner);
      }
      if (!source) throw new Error(`Unknown source handle ${job.sourceHandle}`);
      if ((await fingerprintFile(source.snapshotPath)) !== source.digest) {
        throw new Error("Immutable source snapshot failed its digest check");
      }
      if (source.digest !== job.sourceDigest) {
        throw new Error("Cloud AgentVersion does not match the local snapshot");
      }
      const runtime = this.runtimes[source.provider];
      if (!runtime) throw new Error(`Unsupported provider ${source.provider}`);
      const runtimeSource = {
        sessionId: source.templateSessionId ?? source.originalSessionId,
        originalSessionId: source.originalSessionId,
        templateSessionId: source.templateSessionId,
        cwd: source.cwd,
        path: source.snapshotPath,
        beforeTurnId: source.beforeTurnId,
      };
      const before = await fingerprintFile(source.snapshotPath);
      const result = job.runtimeSessionId
        ? await runtime.continue({
            agent: { source: runtimeSource },
            runtimeSessionId: job.runtimeSessionId,
            message: job.input,
          })
        : await runtime.fork({ source: runtimeSource, message: job.input });
      if ((await fingerprintFile(source.snapshotPath)) !== before) {
        throw new Error("Runtime modified the immutable source snapshot");
      }
      await this.cloud.finishJob(runner.id, runner.token, {
        jobId: job.id,
        leaseToken: job.leaseToken,
        output: result.text,
        runtimeSessionId: result.runtimeSessionId,
      });
      return { status: "completed", jobId: job.id };
    } catch (error) {
      await this.cloud.finishJob(runner.id, runner.token, {
        jobId: job.id,
        leaseToken: job.leaseToken,
        error: error.message,
      });
      return { status: "failed", jobId: job.id, error: error.message };
    }
  }

  async installCapsule(job, runner) {
    const response = await this.cloud.getCapsule(
      runner.id,
      runner.token,
      job.sourceHandle,
    );
    const capsule = decryptSourceCapsule(response.capsule, runner.token);
    const snapshotsDir = path.join(this.state.dataDir, "snapshots");
    await mkdir(snapshotsDir, { recursive: true, mode: 0o700 });
    const snapshotPath = path.join(snapshotsDir, `${job.sourceHandle}.jsonl`);
    await writeFile(snapshotPath, capsule.content, { mode: 0o600 });
    const source = {
      handle: job.sourceHandle,
      provider: capsule.provider,
      originalSessionId: capsule.originalSessionId,
      snapshotPath,
      cwd: process.env.AAAS_RUNNER_CWD ?? this.state.dataDir,
      digest: await fingerprintFile(snapshotPath),
      beforeTurnId: capsule.beforeTurnId,
      templateSessionId: capsule.templateSessionId,
      importedAt: new Date().toISOString(),
      encryptedTransfer: true,
    };
    if (source.digest !== job.sourceDigest) {
      throw new Error("Decrypted source capsule failed its AgentVersion digest");
    }
    await this.state.putSource(source);
    return source;
  }

  async run(signal) {
    while (!signal?.aborted) {
      try {
        const result = await this.runOnce();
        if (result.status === "unconfigured") await delay(2_000, signal);
        else if (result.status === "idle") await delay(this.pollMs, signal);
      } catch (error) {
        process.stderr.write(`[aaas-runner] ${error.message}\n`);
        await delay(Math.max(this.pollMs, 2_000), signal);
      }
    }
  }
}
