import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const EMPTY_STATE = { agents: {}, branches: {} };

export class JsonStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, "state.json");
    this.state = structuredClone(EMPTY_STATE);
    this.loaded = false;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.loaded) return;
    await mkdir(this.dataDir, { recursive: true });
    try {
      this.state = JSON.parse(await readFile(this.file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }

  async getAgent(id) {
    await this.load();
    return this.state.agents[id] ?? null;
  }

  async listAgents() {
    await this.load();
    return Object.values(this.state.agents);
  }

  async putAgent(agent) {
    await this.load();
    this.state.agents[agent.id] = agent;
    await this.persist();
    return agent;
  }

  async getBranch(id) {
    await this.load();
    return this.state.branches[id] ?? null;
  }

  async putBranch(branch) {
    await this.load();
    this.state.branches[branch.id] = branch;
    await this.persist();
    return branch;
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
