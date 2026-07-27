import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const EMPTY_STATE = {
  runner: null,
  sources: {},
  agents: {},
};

export class CloudState {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, "cloud-state.json");
    this.state = structuredClone(EMPTY_STATE);
    this.loaded = false;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.loaded) return this.state;
    await mkdir(this.dataDir, { recursive: true });
    try {
      this.state = {
        ...structuredClone(EMPTY_STATE),
        ...JSON.parse(await readFile(this.file, "utf8")),
      };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    this.loaded = true;
    return this.state;
  }

  async reload() {
    await this.writeQueue;
    this.loaded = false;
    this.state = structuredClone(EMPTY_STATE);
    return this.load();
  }

  async ensureRunner(kind = "local") {
    await this.load();
    if (!this.state.runner) {
      this.state.runner = {
        id: `run_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
        token: randomBytes(32).toString("base64url"),
        kind,
        createdAt: new Date().toISOString(),
      };
      await this.persist();
    }
    return this.state.runner;
  }

  async getRunner() {
    await this.load();
    return this.state.runner;
  }

  async putSource(source) {
    await this.load();
    this.state.sources[source.handle] = source;
    await this.persist();
    return source;
  }

  async getSource(handle) {
    await this.load();
    return this.state.sources[handle] ?? null;
  }

  async putAgent(agent) {
    await this.load();
    this.state.agents[agent.id] = agent;
    await this.persist();
    return agent;
  }

  async persist() {
    const snapshot = JSON.stringify(this.state, null, 2);
    this.writeQueue = this.writeQueue.then(async () => {
      const temporary = `${this.file}.${process.pid}.tmp`;
      await writeFile(temporary, snapshot, { mode: 0o600 });
      await rename(temporary, this.file);
    });
    return this.writeQueue;
  }
}
