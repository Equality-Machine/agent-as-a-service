import { spawn } from "node:child_process";
import readline from "node:readline";

import { fingerprintFile } from "./fingerprint.mjs";

class AppServerClient {
  constructor({ executable, args, cwd, env, timeoutMs }) {
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
    this.child.stdin.end();
    this.child.kill("SIGTERM");
  }
}

export class CodexRuntime {
  constructor(options = {}) {
    this.executable =
      options.executable ?? "/Applications/ChatGPT.app/Contents/Resources/codex";
    this.executableArgs = options.executableArgs ?? ["app-server", "--stdio"];
    this.env = options.env ?? process.env;
    this.timeoutMs = options.timeoutMs ?? 600_000;
  }

  async fingerprintSource(source) {
    return fingerprintFile(source.path);
  }

  async fork({ source, message }) {
    return this.runTurn({
      source,
      threadId: source.sessionId,
      message,
      fork: true,
    });
  }

  async continue({ agent, runtimeSessionId, message }) {
    return this.runTurn({
      source: agent.source,
      threadId: runtimeSessionId,
      message,
      fork: false,
    });
  }

  async runTurn({ source, threadId, message, fork }) {
    const client = new AppServerClient({
      executable: this.executable,
      args: this.executableArgs,
      cwd: source.cwd,
      env: this.env,
      timeoutMs: this.timeoutMs,
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
}
