import { spawn } from "node:child_process";
import { mkdir, symlink } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import readline from "node:readline";

import { fingerprintFile } from "./fingerprint.mjs";

const ISOLATED_FEATURES = [
  "apps",
  "plugins",
  "hooks",
  "memories",
  "skill_search",
  "skill_mcp_dependency_install",
  "multi_agent",
  "computer_use",
  "browser_use",
  "in_app_browser",
  "workspace_dependencies",
];

const isolatedArgs = (args) => {
  const result = [...args];
  for (const feature of ISOLATED_FEATURES) {
    if (!result.some((value, index) => value === "--disable" && result[index + 1] === feature)) {
      result.push("--disable", feature);
    }
  }
  return result;
};

class AppServerClient {
  constructor({ executable, args, cwd, env, timeoutMs, signal }) {
    this.child = spawn(executable, args, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.nextId = 1;
    this.pending = new Map();
    this.notifications = [];
    this.waiters = [];
    this.stderr = "";
    this.closed = false;
    this.timeoutMs = timeoutMs;
    this.signal = signal;
    this.abort = () => {
      const error =
        signal?.reason instanceof Error ? signal.reason : new Error("Codex turn aborted");
      this.child.kill("SIGTERM");
      this.failAll(error);
    };
    signal?.addEventListener("abort", this.abort, { once: true });
    if (signal?.aborted) this.abort();
    this.child.stderr.on("data", (chunk) => {
      this.stderr += chunk.toString("utf8");
    });
    const lines = readline.createInterface({ input: this.child.stdout });
    lines.on("line", (line) => this.onLine(line));
    this.child.on("error", (error) => this.failAll(error));
    this.child.on("close", (code) => {
      if (!this.closed && code !== 0) {
        this.failAll(new Error(`Codex app-server exited with ${code}: ${this.stderr.trim()}`));
      }
    });
  }

  onLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if ("id" in message && ("result" in message || "error" in message)) {
      const pending = this.pending.get(String(message.id));
      if (!pending) return;
      this.pending.delete(String(message.id));
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message ?? "Codex request failed"));
      else pending.resolve(message.result);
      return;
    }
    if (message.method) {
      this.notifications.push(message);
      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(message)) {
          this.waiters.splice(this.waiters.indexOf(waiter), 1);
          clearTimeout(waiter.timer);
          waiter.resolve(message);
        }
      }
    }
  }

  call(method, params) {
    const id = this.nextId++;
    const payload = { method, id, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(String(id));
        reject(new Error(`Codex request ${method} timed out`));
      }, this.timeoutMs);
      this.pending.set(String(id), { resolve, reject, timer });
      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  notify(method, params) {
    this.child.stdin.write(`${JSON.stringify({ method, ...(params === undefined ? {} : { params }) })}\n`);
  }

  waitFor(predicate) {
    const existing = this.notifications.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(waiter), 1);
        reject(new Error("Timed out waiting for Codex turn completion"));
      }, this.timeoutMs);
      this.waiters.push(waiter);
    });
  }

  failAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.waiters.length = 0;
  }

  close() {
    this.closed = true;
    this.signal?.removeEventListener("abort", this.abort);
    this.child.stdin.end();
    this.child.kill("SIGTERM");
  }
}

export class CodexRuntime {
  constructor(options = {}) {
    this.executable =
      options.executable ?? "/Applications/ChatGPT.app/Contents/Resources/codex";
    this.executableArgs = isolatedArgs(
      options.executableArgs ?? ["app-server", "--stdio"],
    );
    this.env = options.env ?? process.env;
    this.sourceCodexHome =
      options.sourceCodexHome ??
      this.env.CODEX_HOME ??
      path.join(homedir(), ".codex");
    this.codexHome =
      options.codexHome ??
      this.env.AAAS_CODEX_HOME ??
      path.join(homedir(), ".aaas", "runtime", "codex-home");
    this.timeoutMs = options.timeoutMs ?? 300_000;
  }

  async fingerprintSource(source) {
    return fingerprintFile(source.path);
  }

  async fork({ source, message, signal }) {
    return this.runTurn({
      source,
      threadId: source.sessionId,
      message,
      fork: true,
      signal,
    });
  }

  async continue({ agent, runtimeSessionId, message, signal }) {
    return this.runTurn({
      source: agent.source,
      threadId: runtimeSessionId,
      message,
      fork: false,
      signal,
    });
  }

  async runTurn({ source, threadId, message, fork, signal }) {
    await this.prepareHome();
    const client = new AppServerClient({
      executable: this.executable,
      args: this.executableArgs,
      cwd: source.cwd,
      env: { ...this.env, CODEX_HOME: this.codexHome },
      timeoutMs: this.timeoutMs,
      signal,
    });
    try {
      await client.call("initialize", {
        clientInfo: { name: "aaas", title: "Agent as a Service", version: "0.1.0" },
        capabilities: { experimentalApi: true, requestAttestation: false },
      });
      client.notify("initialized");
      const threadResult = await client.call(fork ? "thread/fork" : "thread/resume", {
        threadId,
        cwd: source.cwd,
        approvalPolicy: "never",
        sandbox: "read-only",
        excludeTurns: true,
        ...(fork
          ? {
              ephemeral: false,
              deferGoalContinuation: true,
              ...(source.path ? { path: source.path } : {}),
              ...(source.beforeTurnId
                ? { beforeTurnId: source.beforeTurnId }
                : {}),
            }
          : {}),
      });
      const runtimeSessionId = threadResult.thread.id;
      if (fork) {
        // A published Agent inherits context, not the publisher's active task.
        // Clearing the copied goal also prevents automatic goal continuation from
        // running after a consumer turn.
        await client.call("thread/goal/clear", {
          threadId: runtimeSessionId,
        });
      }
      const completed = client.waitFor(
        (event) =>
          event.method === "turn/completed" && event.params?.threadId === runtimeSessionId,
      );
      await client.call("turn/start", {
        threadId: runtimeSessionId,
        input: [{ type: "text", text: message, text_elements: [] }],
        cwd: source.cwd,
        approvalPolicy: "never",
        sandboxPolicy: { type: "readOnly", networkAccess: false },
      });
      const event = await completed;
      const agentMessages = client.notifications
        .filter(
          (notification) =>
            notification.method === "item/completed" &&
            notification.params?.threadId === runtimeSessionId &&
            notification.params?.item?.type === "agentMessage",
        )
        .map((notification) => notification.params.item.text);
      const fallbackMessages = (event.params?.turn?.items ?? [])
        .filter((item) => item.type === "agentMessage")
        .map((item) => item.text);
      const text = [...agentMessages, ...fallbackMessages].at(-1);
      if (event.params?.turn?.status !== "completed" || !text) {
        const detail = event.params?.turn?.error?.message ?? "Codex turn did not produce a message";
        throw new Error(detail);
      }
      return { runtimeSessionId, text };
    } finally {
      client.close();
    }
  }

  async prepareHome() {
    await mkdir(this.codexHome, { recursive: true, mode: 0o700 });
    const sourceAuth = path.join(this.sourceCodexHome, "auth.json");
    const isolatedAuth = path.join(this.codexHome, "auth.json");
    if (sourceAuth === isolatedAuth) return;
    try {
      await symlink(sourceAuth, isolatedAuth);
    } catch (error) {
      if (error.code !== "EEXIST" && error.code !== "ENOENT") throw error;
    }
  }
}
