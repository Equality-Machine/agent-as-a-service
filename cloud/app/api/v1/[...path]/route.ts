import { env } from "cloudflare:workers";

export const runtime = "edge";

type JsonRecord = Record<string, unknown>;
type CapsuleBucket = {
  put(key: string, value: string): Promise<unknown>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function database() {
  const db = env.DB;
  if (!db) throw new Error("D1 binding DB is unavailable");
  return db;
}

function capsuleBucket() {
  const bucket = (env as unknown as Record<string, unknown>)
    .CAPSULES as CapsuleBucket | undefined;
  if (!bucket) throw new Error("R2 binding CAPSULES is unavailable");
  return bucket;
}

async function ensureSchema() {
  const db = database();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS runners (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'local',
      label TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'online',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      version_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL,
      execution_mode TEXT NOT NULL DEFAULT 'local',
      runner_id TEXT NOT NULL,
      source_handle TEXT NOT NULL,
      source_digest TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      agent_version_id TEXT NOT NULL,
      runtime_session_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      runner_id TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT,
      error TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      lease_token TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      claimed_at TEXT,
      completed_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS jobs_runner_status_idx ON jobs (runner_id, status, created_at)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at)",
    ),
  ]);
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function readBody(request: Request): Promise<JsonRecord> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as JsonRecord) : {};
  } catch {
    return {};
  }
}

function textField(body: JsonRecord, name: string, required = false) {
  const value = body[name];
  if (typeof value !== "string" || (required && !value.trim())) {
    if (required) throw new Error(`${name} is required`);
    return "";
  }
  return value.trim();
}

async function authenticatePublisher(request: Request) {
  const configured = (env as unknown as Record<string, string | undefined>)
    .PUBLISH_TOKEN;
  if (!configured) return true;
  return bearer(request) === configured;
}

async function authenticateRunner(request: Request, runnerId: string) {
  const token = bearer(request);
  if (!token) return false;
  const row = await database()
    .prepare("SELECT token_hash FROM runners WHERE id = ?")
    .bind(runnerId)
    .first<{ token_hash: string }>();
  return Boolean(row && row.token_hash === (await sha256(token)));
}

function publicAgent(row: Record<string, unknown>) {
  return {
    id: row.id,
    versionId: row.version_id,
    name: row.name,
    description: row.description,
    provider: row.provider,
    executionMode: row.execution_mode,
    status: row.status,
    availability: row.runner_available ? "online" : "offline",
    runnerLastSeenAt: row.runner_last_seen_at,
    createdAt: row.created_at,
  };
}

async function publish(request: Request) {
  if (!(await authenticatePublisher(request))) {
    return json({ error: "Invalid publisher token" }, 401);
  }
  const body = await readBody(request);
  let runnerToken: string;
  let sourceHandle: string;
  let sourceDigest: string;
  let provider: string;
  let name: string;
  try {
    runnerToken = textField(body, "runnerToken", true);
    sourceHandle = textField(body, "sourceHandle", true);
    sourceDigest = textField(body, "sourceDigest", true);
    provider = textField(body, "provider", true);
    name = textField(body, "name", true);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }

  const runnerId = textField(body, "runnerId") || randomId("run");
  const agentId = randomId("agt");
  const versionId = randomId("ver");
  const kind = textField(body, "runnerKind") || "local";
  const executionMode = textField(body, "executionMode") || kind;
  const description = textField(body, "description");
  const capsule = textField(body, "capsule");
  if (executionMode === "cloud" && !capsule) {
    return json({ error: "Encrypted capsule is required for cloud execution" }, 400);
  }
  if (capsule) {
    await capsuleBucket().put(`sources/${sourceHandle}`, capsule);
  }
  const db = database();
  await db.batch([
    db
      .prepare(
        `INSERT INTO runners (id, token_hash, kind, label, status, last_seen_at)
         VALUES (?, ?, ?, ?, 'online', CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash,
           kind = excluded.kind, label = excluded.label, status = 'online',
           last_seen_at = CURRENT_TIMESTAMP`,
      )
      .bind(
        runnerId,
        await sha256(runnerToken),
        kind,
        textField(body, "runnerLabel") || "Publisher runner",
      ),
    db
      .prepare(
        `INSERT INTO agents
          (id, version_id, name, description, provider, execution_mode,
           runner_id, source_handle, source_digest, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      )
      .bind(
        agentId,
        versionId,
        name,
        description,
        provider,
        executionMode,
        runnerId,
        sourceHandle,
        sourceDigest,
      ),
  ]);

  return json(
    {
      agent: {
        id: agentId,
        versionId,
        name,
        description,
        provider,
        executionMode,
        status: "active",
      },
      runnerId,
    },
    201,
  );
}

async function getAgent(agentId: string) {
  const row = await database()
    .prepare(
      `SELECT a.id, a.version_id, a.name, a.description, a.provider,
              a.execution_mode, a.status, a.created_at,
              r.last_seen_at AS runner_last_seen_at,
              CASE WHEN datetime(r.last_seen_at) >= datetime('now', '-20 seconds')
                THEN 1 ELSE 0 END AS runner_available
       FROM agents a
       LEFT JOIN runners r ON r.id = a.runner_id
       WHERE a.id = ? AND a.status = 'active'`,
    )
    .bind(agentId)
    .first<Record<string, unknown>>();
  if (!row) return json({ error: "Agent not found" }, 404);
  return json({ agent: publicAgent(row) });
}

async function invoke(request: Request) {
  const body = await readBody(request);
  const input = textField(body, "input");
  if (!input) return json({ error: "input is required" }, 400);

  const db = database();
  let conversationId = textField(body, "conversationId");
  let conversation:
    | {
        id: string;
        agent_id: string;
        agent_version_id: string;
        status: string;
      }
    | null = null;
  if (conversationId) {
    conversation = await db
      .prepare(
        `SELECT id, agent_id, agent_version_id, status
         FROM conversations WHERE id = ?`,
      )
      .bind(conversationId)
      .first();
    if (!conversation || conversation.status !== "active") {
      return json({ error: "Active conversation not found" }, 404);
    }
  }

  const agentId = conversation?.agent_id ?? textField(body, "agentId");
  if (!agentId) return json({ error: "agentId is required" }, 400);
  const agent = await db
    .prepare(
      `SELECT id, version_id, runner_id, status FROM agents
       WHERE id = ? AND status = 'active'`,
    )
    .bind(agentId)
    .first<{
      id: string;
      version_id: string;
      runner_id: string;
      status: string;
    }>();
  if (!agent) return json({ error: "Agent not found" }, 404);

  if (!conversation) {
    conversationId = randomId("cnv");
    await db
      .prepare(
        `INSERT INTO conversations
          (id, agent_id, agent_version_id, status)
         VALUES (?, ?, ?, 'active')`,
      )
      .bind(conversationId, agent.id, agent.version_id)
      .run();
  }

  const jobId = randomId("job");
  await db.batch([
    db
      .prepare(
        `INSERT INTO jobs
          (id, conversation_id, agent_id, runner_id, input, status)
         VALUES (?, ?, ?, ?, ?, 'queued')`,
      )
      .bind(jobId, conversationId, agent.id, agent.runner_id, input),
    db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content)
         VALUES (?, ?, 'user', ?)`,
      )
      .bind(randomId("msg"), conversationId, input),
    db
      .prepare(
        "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .bind(conversationId),
  ]);

  return json(
    { jobId, conversationId, agentId: agent.id, status: "queued" },
    202,
  );
}

async function getJob(jobId: string) {
  const row = await database()
    .prepare(
      `SELECT id, conversation_id, agent_id, status, output, error,
              created_at, claimed_at, completed_at
       FROM jobs WHERE id = ?`,
    )
    .bind(jobId)
    .first<Record<string, unknown>>();
  if (!row) return json({ error: "Job not found" }, 404);
  return json({
    job: {
      id: row.id,
      conversationId: row.conversation_id,
      agentId: row.agent_id,
      status: row.status,
      output: row.output,
      error: row.error,
      createdAt: row.created_at,
      claimedAt: row.claimed_at,
      completedAt: row.completed_at,
    },
  });
}

async function nextJob(request: Request, runnerId: string) {
  if (!(await authenticateRunner(request, runnerId))) {
    return json({ error: "Invalid runner credentials" }, 401);
  }
  const db = database();
  await db
    .prepare(
      `UPDATE runners SET status = 'online', last_seen_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(runnerId)
    .run();
  await db
    .prepare(
      `UPDATE jobs SET status = 'queued', lease_token = NULL, claimed_at = NULL
       WHERE runner_id = ? AND status = 'claimed'
         AND datetime(claimed_at) < datetime('now', '-10 minutes')`,
    )
    .bind(runnerId)
    .run();

  const queued = await db
    .prepare(
      `SELECT j.id, j.conversation_id, j.input, j.agent_id,
              c.runtime_session_id, a.source_handle, a.source_digest,
              a.provider, a.version_id, a.execution_mode
       FROM jobs j
       JOIN conversations c ON c.id = j.conversation_id
       JOIN agents a ON a.id = j.agent_id
       WHERE j.runner_id = ? AND j.status = 'queued'
         AND NOT EXISTS (
           SELECT 1 FROM jobs active
           WHERE active.conversation_id = j.conversation_id
             AND active.status = 'claimed'
         )
       ORDER BY j.created_at LIMIT 1`,
    )
    .bind(runnerId)
    .first<Record<string, unknown>>();
  if (!queued) return new Response(null, { status: 204, headers: corsHeaders });

  const leaseToken = randomId("lease");
  const claimed = await db
    .prepare(
      `UPDATE jobs SET status = 'claimed', lease_token = ?,
         claimed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'queued'`,
    )
    .bind(leaseToken, queued.id)
    .run();
  if (!claimed.meta.changes) {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return json({
    job: {
      id: queued.id,
      conversationId: queued.conversation_id,
      agentId: queued.agent_id,
      agentVersionId: queued.version_id,
      sourceHandle: queued.source_handle,
      sourceDigest: queued.source_digest,
      provider: queued.provider,
      executionMode: queued.execution_mode,
      capsuleAvailable: queued.execution_mode === "cloud",
      runtimeSessionId: queued.runtime_session_id,
      input: queued.input,
      leaseToken,
    },
  });
}

async function getCapsule(
  request: Request,
  runnerId: string,
  sourceHandle: string,
) {
  if (!(await authenticateRunner(request, runnerId))) {
    return json({ error: "Invalid runner credentials" }, 401);
  }
  const allowed = await database()
    .prepare(
      `SELECT id FROM agents
       WHERE runner_id = ? AND source_handle = ? AND status = 'active'`,
    )
    .bind(runnerId, sourceHandle)
    .first();
  if (!allowed) return json({ error: "Source capsule not found" }, 404);
  const object = await capsuleBucket().get(`sources/${sourceHandle}`);
  if (!object) return json({ error: "Source capsule not found" }, 404);
  return json({ sourceHandle, capsule: await object.text() });
}

async function finishJob(request: Request, runnerId: string) {
  if (!(await authenticateRunner(request, runnerId))) {
    return json({ error: "Invalid runner credentials" }, 401);
  }
  const body = await readBody(request);
  const jobId = textField(body, "jobId");
  const leaseToken = textField(body, "leaseToken");
  if (!jobId || !leaseToken) {
    return json({ error: "jobId and leaseToken are required" }, 400);
  }
  const output = textField(body, "output");
  const error = textField(body, "error");
  if (!output && !error) {
    return json({ error: "output or error is required" }, 400);
  }

  const db = database();
  const job = await db
    .prepare(
      `SELECT id, conversation_id FROM jobs
       WHERE id = ? AND runner_id = ? AND lease_token = ? AND status = 'claimed'`,
    )
    .bind(jobId, runnerId, leaseToken)
    .first<{ id: string; conversation_id: string }>();
  if (!job) return json({ error: "Active lease not found" }, 409);

  const runtimeSessionId = textField(body, "runtimeSessionId");
  const status = error ? "failed" : "completed";
  const statements = [
    db
      .prepare(
        `UPDATE jobs SET status = ?, output = ?, error = ?,
           completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND lease_token = ?`,
      )
      .bind(status, output || null, error || null, jobId, leaseToken),
    db
      .prepare(
        `UPDATE conversations SET runtime_session_id = COALESCE(?, runtime_session_id),
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .bind(runtimeSessionId || null, job.conversation_id),
  ];
  if (output) {
    statements.push(
      db
        .prepare(
          `INSERT INTO messages (id, conversation_id, role, content)
           VALUES (?, ?, 'assistant', ?)`,
        )
        .bind(randomId("msg"), job.conversation_id, output),
    );
  }
  await db.batch(statements);
  return json({ jobId, status, conversationId: job.conversation_id });
}

async function endConversation(conversationId: string) {
  const result = await database()
    .prepare(
      `UPDATE conversations SET status = 'ended', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'active'`,
    )
    .bind(conversationId)
    .run();
  if (!result.meta.changes) {
    return json({ error: "Active conversation not found" }, 404);
  }
  return json({ conversationId, status: "ended" });
}

async function history(conversationId: string) {
  const rows = await database()
    .prepare(
      `SELECT role, content, created_at FROM messages
       WHERE conversation_id = ? ORDER BY created_at, rowid`,
    )
    .bind(conversationId)
    .all<Record<string, unknown>>();
  return json({
    conversationId,
    messages: rows.results.map((row) => ({
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    })),
  });
}

async function route(request: Request) {
  await ensureSchema();
  const path = new URL(request.url).pathname
    .replace(/^\/api\/v1\/?/, "")
    .split("/")
    .filter(Boolean);
  const method = request.method;

  if (method === "GET" && path[0] === "health") {
    return json({ ok: true, service: "AaaS control plane" });
  }
  if (method === "POST" && path[0] === "publish" && path.length === 1) {
    return publish(request);
  }
  if (method === "GET" && path[0] === "agents" && path[1]) {
    return getAgent(path[1]);
  }
  if (method === "POST" && path[0] === "invoke" && path.length === 1) {
    return invoke(request);
  }
  if (method === "GET" && path[0] === "jobs" && path[1]) {
    return getJob(path[1]);
  }
  if (
    method === "GET" &&
    path[0] === "runners" &&
    path[1] &&
    path[2] === "next"
  ) {
    return nextJob(request, path[1]);
  }
  if (
    method === "POST" &&
    path[0] === "runners" &&
    path[1] &&
    path[2] === "result"
  ) {
    return finishJob(request, path[1]);
  }
  if (
    method === "GET" &&
    path[0] === "runners" &&
    path[1] &&
    path[2] === "sources" &&
    path[3]
  ) {
    return getCapsule(request, path[1], path[3]);
  }
  if (
    method === "POST" &&
    path[0] === "conversations" &&
    path[1] &&
    path[2] === "end"
  ) {
    return endConversation(path[1]);
  }
  if (
    method === "GET" &&
    path[0] === "conversations" &&
    path[1] &&
    path[2] === "messages"
  ) {
    return history(path[1]);
  }
  return json({ error: "Route not found" }, 404);
}

export async function GET(request: Request) {
  try {
    return await route(request);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
}

export async function POST(request: Request) {
  try {
    return await route(request);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
