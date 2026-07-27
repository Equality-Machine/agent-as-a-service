function normalizeUrl(value) {
  return value.replace(/\/+$/, "");
}

export class CloudClient {
  constructor({ baseUrl, publisherToken = null, fetchImpl = fetch }) {
    if (!baseUrl) throw new Error("AAAS_CLOUD_URL is required");
    this.baseUrl = normalizeUrl(baseUrl);
    this.publisherToken = publisherToken;
    this.fetch = fetchImpl;
  }

  async request(pathname, options = {}) {
    const response = await this.fetch(`${this.baseUrl}${pathname}`, options);
    if (response.status === 204) return null;
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`AaaS cloud returned invalid JSON (${response.status})`);
    }
    if (!response.ok) {
      throw new Error(body.error ?? `AaaS cloud request failed (${response.status})`);
    }
    return body;
  }

  jsonHeaders(token = null) {
    return {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  publish(payload) {
    return this.request("/api/v1/publish", {
      method: "POST",
      headers: this.jsonHeaders(this.publisherToken),
      body: JSON.stringify(payload),
    });
  }

  findAgent(agentId) {
    return this.request(`/api/v1/agents/${encodeURIComponent(agentId)}`);
  }

  invoke(payload) {
    return this.request("/api/v1/invoke", {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify(payload),
    });
  }

  getJob(jobId) {
    return this.request(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
  }

  nextJob(runnerId, runnerToken) {
    return this.request(`/api/v1/runners/${encodeURIComponent(runnerId)}/next`, {
      headers: this.jsonHeaders(runnerToken),
    });
  }

  finishJob(runnerId, runnerToken, payload) {
    return this.request(`/api/v1/runners/${encodeURIComponent(runnerId)}/result`, {
      method: "POST",
      headers: this.jsonHeaders(runnerToken),
      body: JSON.stringify(payload),
    });
  }

  heartbeatJob(runnerId, runnerToken, payload) {
    return this.request(
      `/api/v1/runners/${encodeURIComponent(
        runnerId,
      )}/jobs/${encodeURIComponent(payload.jobId)}/heartbeat`,
      {
        method: "POST",
        headers: this.jsonHeaders(runnerToken),
        body: JSON.stringify(payload),
      },
    );
  }

  cancelJob(jobId) {
    return this.request(`/api/v1/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
      headers: this.jsonHeaders(),
    });
  }

  getCapsule(runnerId, runnerToken, sourceHandle) {
    return this.request(
      `/api/v1/runners/${encodeURIComponent(
        runnerId,
      )}/sources/${encodeURIComponent(sourceHandle)}`,
      { headers: this.jsonHeaders(runnerToken) },
    );
  }

  endConversation(conversationId) {
    return this.request(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/end`,
      { method: "POST", headers: this.jsonHeaders() },
    );
  }

  async invokeAndWait(payload, options = {}) {
    const queued = await this.invoke(payload);
    const timeoutMs = options.timeoutMs ?? 600_000;
    const pollMs = options.pollMs ?? 750;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      const result = await this.getJob(queued.jobId);
      options.onStatus?.(result.job);
      if (result.job.status === "completed") {
        return {
          conversationId: queued.conversationId,
          jobId: queued.jobId,
          message: result.job.output,
        };
      }
      if (result.job.status === "failed") {
        throw new Error(result.job.error ?? "Agent execution failed");
      }
      if (result.job.status === "cancelled") {
        throw new Error(result.job.error ?? "Agent invocation was cancelled");
      }
    }
    await this.cancelJob(queued.jobId).catch(() => {});
    throw new Error(
      `Timed out waiting for the agent runner after ${Math.round(timeoutMs / 1_000)} seconds`,
    );
  }
}
