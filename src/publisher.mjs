import { randomUUID } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CloudClient } from "./cloud-client.mjs";
import { CloudState } from "./cloud-state.mjs";
import { encryptSourceCapsule } from "./capsule.mjs";
import { fingerprintFile } from "./runtimes/fingerprint.mjs";
import { discoverSessions } from "./session-discovery.mjs";

async function lastCodexTurnId(file) {
  const lines = (await readFile(file, "utf8")).split("\n");
  let turnId = null;
  for (const line of lines) {
    if (!line.includes('"type":"turn_context"')) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "turn_context" && event.payload?.turn_id) {
        turnId = event.payload.turn_id;
      }
    } catch {
      // A concurrently appended partial line is not part of the snapshot boundary.
    }
  }
  return turnId;
}

async function freezeClaudeSnapshot(file) {
  const lines = (await readFile(file, "utf8")).split("\n");
  let lastComplete = -1;
  for (let index = 0; index < lines.length; index += 1) {
    try {
      const event = JSON.parse(lines[index]);
      if (event.type === "assistant" && event.message?.stop_reason) {
        lastComplete = index;
      }
    } catch {
      // Ignore a concurrently appended partial line.
    }
  }
  if (lastComplete < 0) {
    throw new Error("Claude session has no completed assistant turn to publish");
  }
  await writeFile(file, `${lines.slice(0, lastComplete + 1).join("\n")}\n`, {
    mode: 0o600,
  });
}

async function resolveSession({ provider, sessionId, cwd }) {
  const sessions = await discoverSessions({ provider, limit: 2_000 });
  if (sessionId) {
    const exact = sessions.find((session) => session.sessionId === sessionId);
    if (!exact) throw new Error(`${provider} session ${sessionId} was not found`);
    return exact;
  }
  const candidates = sessions.filter(
    (session) => !cwd || path.resolve(session.cwd) === path.resolve(cwd),
  );
  if (!candidates[0]) {
    throw new Error(`No ${provider} session was found for ${cwd || "this workspace"}`);
  }
  return candidates[0];
}

export class Publisher {
  constructor({
    dataDir,
    cloudUrl,
    publisherToken = null,
    env = process.env,
    cloudClient = null,
    sessionResolver = resolveSession,
  }) {
    this.dataDir = dataDir;
    this.env = env;
    this.state = new CloudState(dataDir);
    this.sessionResolver = sessionResolver;
    this.cloud =
      cloudClient ??
      new CloudClient({ baseUrl: cloudUrl, publisherToken });
  }

  async detectCurrent(input = {}) {
    const provider =
      input.provider ??
      (this.env.CODEX_THREAD_ID ? "codex" : this.env.CLAUDE_SESSION_ID ? "claude" : null);
    if (!provider) {
      throw new Error(
        "Could not identify the current session. Pass provider and sessionId explicitly.",
      );
    }
    const sessionId =
      input.sessionId ??
      (provider === "codex"
        ? this.env.CODEX_THREAD_ID
        : this.env.CLAUDE_SESSION_ID);
    return this.sessionResolver({
      provider,
      sessionId,
      cwd: input.cwd ?? process.cwd(),
    });
  }

  async snapshot(input = {}) {
    const session = await this.detectCurrent(input);
    const snapshotsDir = path.join(this.dataDir, "snapshots");
    await mkdir(snapshotsDir, { recursive: true, mode: 0o700 });
    const handle = `src_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const snapshotPath = path.join(snapshotsDir, `${handle}.jsonl`);
    await copyFile(session.path, snapshotPath);
    await chmod(snapshotPath, 0o600);
    if (session.provider === "claude") {
      await freezeClaudeSnapshot(snapshotPath);
    }
    const source = {
      handle,
      provider: session.provider,
      originalSessionId: session.sessionId,
      originalPath: session.path,
      snapshotPath,
      cwd: session.cwd,
      digest: await fingerprintFile(snapshotPath),
      beforeTurnId:
        session.provider === "codex" &&
        session.sessionId === this.env.CODEX_THREAD_ID
          ? await lastCodexTurnId(snapshotPath)
          : null,
      templateSessionId:
        session.provider === "claude" ? randomUUID() : null,
      createdAt: new Date().toISOString(),
    };
    await this.state.putSource(source);
    return source;
  }

  async publishCurrent(input = {}) {
    const source = await this.snapshot(input);
    const executionMode = input.executionMode ?? "local";
    if (!["local", "cloud"].includes(executionMode)) {
      throw new Error("executionMode must be local or cloud");
    }
    const runner =
      executionMode === "cloud"
        ? {
            id:
              input.runnerId ??
              this.env.AAAS_CLOUD_RUNNER_ID,
            token:
              input.runnerToken ??
              this.env.AAAS_CLOUD_RUNNER_TOKEN,
            kind: "cloud",
          }
        : await this.state.ensureRunner("local");
    if (!runner.id || !runner.token) {
      throw new Error(
        "Cloud execution requires AAAS_CLOUD_RUNNER_ID and AAAS_CLOUD_RUNNER_TOKEN",
      );
    }
    const capsule =
      executionMode === "cloud"
        ? await encryptSourceCapsule(source, runner.token)
        : null;
    const published = await this.cloud.publish({
      name: input.name?.trim() || `Published ${source.provider} agent`,
      description:
        input.description?.trim() ||
        "A fork-safe agent published from an immutable conversation snapshot.",
      provider: source.provider,
      executionMode,
      runnerKind: runner.kind,
      runnerId: runner.id,
      runnerToken: runner.token,
      runnerLabel: input.runnerLabel ?? `${source.provider} publisher`,
      sourceHandle: source.handle,
      sourceDigest: source.digest,
      ...(capsule ? { capsule } : {}),
    });
    const agent = {
      ...published.agent,
      sourceHandle: source.handle,
      runnerId: runner.id,
      shareUrl: `${this.cloud.baseUrl}/a/${encodeURIComponent(
        published.agent.id,
      )}`,
      publishedAt: new Date().toISOString(),
    };
    await this.state.putAgent(agent);
    return agent;
  }
}
