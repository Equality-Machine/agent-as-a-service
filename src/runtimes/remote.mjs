export class RemoteRuntime {
  constructor({ token, fetchImpl = fetch, timeoutMs = 600_000 }) {
    if (!token) throw new Error("Remote runtime token is required");
    this.token = token;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  forAgent(agent) {
    if (!agent.runnerUrl) throw new Error("Remote agent is missing runnerUrl");
    const call = (operation, body) => this.call(agent.runnerUrl, operation, body);
    return {
      fingerprintSource: (source) =>
        call("fingerprint", { provider: agent.provider, source }),
      fork: ({ source, message }) =>
        call("fork", { provider: agent.provider, source, message, agent }),
      continue: ({ runtimeSessionId, message }) =>
        call("continue", {
          provider: agent.provider,
          runtimeSessionId,
          message,
          agent,
        }),
    };
  }

  async call(runnerUrl, operation, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetch(
        `${runnerUrl.replace(/\/$/, "")}/internal/runtime/${operation}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? `Runner returned HTTP ${response.status}`);
      }
      return payload.result;
    } finally {
      clearTimeout(timer);
    }
  }
}
