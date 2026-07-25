import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { fingerprintFile } from "./fingerprint.mjs";
import { runProcess } from "./process.mjs";

export class ClaudeRuntime {
  constructor(options = {}) {
    this.executable = options.executable ?? "claude";
    this.env = options.env ?? process.env;
    this.timeoutMs = options.timeoutMs ?? 300_000;
    this.allowedTools = options.allowedTools ?? "Read,Grep,Glob";
    this.configDir =
      options.configDir ??
      this.env.CLAUDE_CONFIG_DIR ??
      path.join(os.homedir(), ".claude");
  }

  async fingerprintSource(source) {
    return fingerprintFile(source.path);
  }

  async fork({ source, message }) {
    await this.materializeTemplate(source);
    return this.runTurn({
      cwd: source.cwd,
      sessionId: source.sessionId,
      message,
      fork: true,
    });
  }

  async materializeTemplate(source) {
    if (!source.templateSessionId || !source.path) return;
    const projectKey = source.cwd.replaceAll(/[^a-zA-Z0-9]/g, "-");
    const projectDir = path.join(this.configDir, "projects", projectKey);
    await mkdir(projectDir, { recursive: true, mode: 0o700 });
    const target = path.join(projectDir, `${source.templateSessionId}.jsonl`);
    const original = source.originalSessionId;
    const lines = (await readFile(source.path, "utf8"))
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const event = JSON.parse(line);
        if (event.sessionId === original) {
          event.sessionId = source.templateSessionId;
        }
        return JSON.stringify(event);
      });
    await writeFile(target, `${lines.join("\n")}\n`, { mode: 0o600 });
  }

  async continue({ agent, runtimeSessionId, message }) {
    return this.runTurn({
      cwd: agent.source.cwd,
      sessionId: runtimeSessionId,
      message,
      fork: false,
    });
  }

  async runTurn({ cwd, sessionId, message, fork }) {
    const args = [
      "-p",
      message,
      "--resume",
      sessionId,
      ...(fork ? ["--fork-session"] : []),
      "--output-format",
      "json",
      "--permission-mode",
      "dontAsk",
      "--allowedTools",
      this.allowedTools,
    ];
    const result = await runProcess(this.executable, args, {
      cwd,
      env: this.env,
      timeoutMs: this.timeoutMs,
    });
    let payload;
    try {
      payload = JSON.parse(result.stdout);
    } catch {
      throw new Error(`Claude returned invalid JSON: ${result.stdout.slice(0, 500)}`);
    }
    const runtimeSessionId = payload.session_id ?? payload.sessionId;
    if (!runtimeSessionId || typeof payload.result !== "string") {
      throw new Error("Claude response is missing session_id or result");
    }
    return { runtimeSessionId, text: payload.result, raw: payload };
  }
}
