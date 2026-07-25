import { randomUUID } from "node:crypto";

export class AaasError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class AaasService {
  constructor({ store, runtimes, remoteRuntime = null }) {
    this.store = store;
    this.runtimes = runtimes;
    this.remoteRuntime = remoteRuntime;
    this.branchQueues = new Map();
  }

  async publishAgent(input) {
    for (const key of ["name", "provider", "sourceSessionId", "cwd"]) {
      if (typeof input[key] !== "string" || input[key].trim() === "") {
        throw new AaasError(400, "invalid_agent", `${key} is required`);
      }
    }
    if (!this.runtimes[input.provider]) {
      throw new AaasError(400, "unsupported_provider", `Unsupported provider: ${input.provider}`);
    }
    if (!["local", "remote"].includes(input.placement ?? "local")) {
      throw new AaasError(400, "invalid_placement", "placement must be local or remote");
    }
    if (input.placement === "remote") {
      if (!this.remoteRuntime) {
        throw new AaasError(400, "remote_unavailable", "Remote runtime is not configured");
      }
      try {
        const url = new URL(input.runnerUrl);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        throw new AaasError(400, "invalid_runner_url", "runnerUrl must be an HTTP(S) URL");
      }
    }
    const now = new Date().toISOString();
    const agent = {
      id: randomUUID(),
      versionId: randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      provider: input.provider,
      source: {
        sessionId: input.sourceSessionId,
        cwd: input.cwd,
        path: input.sourceSessionPath ?? null,
      },
      placement: input.placement ?? "local",
      runnerUrl: input.runnerUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    agent.sourceDigest = await this.runtimeFor(agent).fingerprintSource(agent.source);
    await this.store.putAgent(agent);
    return this.publicAgent(agent);
  }

  async listAgents() {
    return (await this.store.listAgents()).map((agent) => this.publicAgent(agent));
  }

  async getPublicAgent(id) {
    return this.publicAgent(await this.requireAgent(id));
  }

  async createBranch(agentId) {
    const agent = await this.requireAgent(agentId);
    const now = new Date().toISOString();
    return this.store.putBranch({
      id: randomUUID(),
      agentId: agent.id,
      status: "active",
      runtimeSessionId: null,
      sourceFingerprint: null,
      messages: [],
      createdAt: now,
      updatedAt: now,
      endedAt: null,
    });
  }

  async sendMessage(branchId, message) {
    if (typeof message !== "string" || message.trim() === "") {
      throw new AaasError(400, "invalid_message", "message is required");
    }
    const previous = this.branchQueues.get(branchId) ?? Promise.resolve();
    const current = previous.then(() => this.sendMessageSerial(branchId, message));
    const queued = current.catch(() => {});
    this.branchQueues.set(branchId, queued);
    queued.finally(() => {
      if (this.branchQueues.get(branchId) === queued) this.branchQueues.delete(branchId);
    });
    return current;
  }

  async sendMessageSerial(branchId, message) {
    const branch = await this.requireBranch(branchId);
    if (branch.status !== "active") {
      throw new AaasError(409, "branch_ended", "This branch has ended");
    }
    const agent = await this.requireAgent(branch.agentId);
    const runtime = this.runtimeFor(agent);
    const sourceFingerprint = await runtime.fingerprintSource(agent.source);
    if (
      agent.sourceDigest !== "unavailable" &&
      agent.sourceDigest !== sourceFingerprint
    ) {
      throw new AaasError(
        409,
        "source_changed",
        "The published source changed; publish a new Agent version",
      );
    }
    if (branch.sourceFingerprint && branch.sourceFingerprint !== sourceFingerprint) {
      throw new AaasError(409, "source_changed", "Source session changed after this branch started");
    }
    const result = branch.runtimeSessionId
      ? await runtime.continue({
          agent,
          runtimeSessionId: branch.runtimeSessionId,
          message,
        })
      : await runtime.fork({ agent, source: agent.source, message });
    const fingerprintAfter = await runtime.fingerprintSource(agent.source);
    if (sourceFingerprint !== fingerprintAfter) {
      throw new AaasError(500, "source_polluted", "Runtime modified the source session");
    }
    const now = new Date().toISOString();
    branch.runtimeSessionId = result.runtimeSessionId;
    branch.sourceFingerprint ??= sourceFingerprint;
    branch.messages.push(
      { role: "user", text: message, at: now },
      { role: "assistant", text: result.text, at: now },
    );
    branch.updatedAt = now;
    await this.store.putBranch(branch);
    return {
      branchId: branch.id,
      runtimeSessionId: branch.runtimeSessionId,
      message: result.text,
    };
  }

  async endBranch(branchId) {
    const branch = await this.requireBranch(branchId);
    if (branch.status === "active") {
      branch.status = "ended";
      branch.endedAt = new Date().toISOString();
      branch.updatedAt = branch.endedAt;
      await this.store.putBranch(branch);
    }
    return branch;
  }

  async createResponse(input) {
    const hasAgent = typeof input.agent === "string";
    const hasConversation = typeof input.conversation === "string";
    if (hasAgent === hasConversation) {
      throw new AaasError(
        400,
        "invalid_response_target",
        "Provide exactly one of agent or conversation",
      );
    }
    const conversation = hasAgent
      ? await this.createBranch(input.agent)
      : await this.requireBranch(input.conversation);
    const result = await this.sendMessage(conversation.id, input.input);
    return {
      id: randomUUID(),
      conversation_id: conversation.id,
      status: "completed",
      output: [{ type: "output_text", text: result.message }],
    };
  }

  async getBranch(branchId) {
    return this.requireBranch(branchId);
  }

  async requireAgent(id) {
    const agent = await this.store.getAgent(id);
    if (!agent) throw new AaasError(404, "agent_not_found", "Agent not found");
    return agent;
  }

  async requireBranch(id) {
    const branch = await this.store.getBranch(id);
    if (!branch) throw new AaasError(404, "branch_not_found", "Branch not found");
    return branch;
  }

  runtimeFor(agent) {
    if (agent.placement === "remote") return this.remoteRuntime.forAgent(agent);
    return this.runtimes[agent.provider];
  }

  publicAgent(agent) {
    return {
      id: agent.id,
      version_id: agent.versionId,
      name: agent.name,
      description: agent.description,
      provider: agent.provider,
      placement: agent.placement,
      source_digest: agent.sourceDigest,
      status: "ready",
      created_at: agent.createdAt,
      updated_at: agent.updatedAt,
    };
  }
}
