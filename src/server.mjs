import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AaasError, AaasService } from "./service.mjs";
import { handleMcp } from "./mcp.mjs";
import { discoverSessions } from "./session-discovery.mjs";
import { renderAgentSkill } from "./skill.mjs";
import { JsonStore } from "./store.mjs";

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const STATIC_FILES = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
};

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new AaasError(413, "body_too_large", "Request body is too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AaasError(400, "invalid_json", "Request body must be valid JSON");
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function sendText(response, status, contentType, body) {
  response.writeHead(status, {
    "content-type": contentType,
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

export function createAaasServer({
  dataDir,
  runtimes,
  remoteRuntime = null,
  runnerToken = null,
  adminToken = null,
  apiToken = null,
}) {
  const service = new AaasService({
    store: new JsonStore(dataDir),
    runtimes,
    remoteRuntime,
  });
  const nodeServer = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      let match;
      const staticFile = request.method === "GET" && STATIC_FILES[url.pathname];
      if (staticFile) {
        const [file, contentType] = staticFile;
        return sendText(response, 200, contentType, await readFile(path.join(PUBLIC_DIR, file)));
      }
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, { ok: true });
      }
      if (
        adminToken &&
        (url.pathname === "/api/sources" ||
          (url.pathname === "/api/agents" && request.method === "POST")) &&
        request.headers.authorization !== `Bearer ${adminToken}`
      ) {
        return sendJson(response, 401, {
          error: { code: "unauthorized", message: "Invalid admin token" },
        });
      }
      if (
        apiToken &&
        (url.pathname === "/mcp" ||
          url.pathname.startsWith("/v1/responses") ||
          url.pathname.startsWith("/v1/conversations/")) &&
        request.headers.authorization !== `Bearer ${apiToken}`
      ) {
        return sendJson(response, 401, {
          error: { code: "unauthorized", message: "Invalid API token" },
        });
      }
      if (request.method === "POST" && url.pathname === "/mcp") {
        return sendJson(response, 200, await handleMcp(service, await readJson(request)));
      }
      if (request.method === "GET" && url.pathname === "/api/sources") {
        const provider = url.searchParams.get("provider") ?? "codex";
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 100);
        return sendJson(response, 200, await discoverSessions({ provider, limit }));
      }
      if (
        request.method === "GET" &&
        (match = url.pathname.match(/^\/v1\/agents\/([^/]+)\/skill$/))
      ) {
        const agent = await service.getPublicAgent(match[1]);
        const forwarded = request.headers["x-forwarded-host"];
        const host = forwarded || request.headers.host || "127.0.0.1";
        const protocol = request.headers["x-forwarded-proto"] || "http";
        return sendText(
          response,
          200,
          "text/markdown; charset=utf-8",
          renderAgentSkill(agent, `${protocol}://${host}`),
        );
      }
      if (
        request.method === "POST" &&
        (match = url.pathname.match(/^\/internal\/runtime\/(fingerprint|fork|continue)$/))
      ) {
        if (!runnerToken || request.headers.authorization !== `Bearer ${runnerToken}`) {
          return sendJson(response, 401, {
            error: { code: "unauthorized", message: "Invalid runner token" },
          });
        }
        const body = await readJson(request);
        const runtime = runtimes[body.provider];
        if (!runtime) {
          throw new AaasError(400, "unsupported_provider", "Unsupported runner provider");
        }
        let result;
        if (match[1] === "fingerprint") {
          result = await runtime.fingerprintSource(body.source);
        } else if (match[1] === "fork") {
          result = await runtime.fork({
            source: body.source,
            message: body.message,
            agent: body.agent,
          });
        } else {
          result = await runtime.continue({
            runtimeSessionId: body.runtimeSessionId,
            message: body.message,
            agent: body.agent,
          });
        }
        return sendJson(response, 200, { result });
      }
      if (request.method === "GET" && url.pathname === "/api/agents") {
        return sendJson(response, 200, await service.listAgents());
      }
      if (request.method === "POST" && url.pathname === "/api/agents") {
        return sendJson(response, 201, await service.publishAgent(await readJson(request)));
      }
      if (request.method === "POST" && url.pathname === "/v1/responses") {
        return sendJson(response, 201, await service.createResponse(await readJson(request)));
      }
      if (
        request.method === "POST" &&
        (match = url.pathname.match(/^\/v1\/conversations\/([^/]+)\/close$/))
      ) {
        const branch = await service.endBranch(match[1]);
        return sendJson(response, 200, {
          id: branch.id,
          status: branch.status === "ended" ? "closed" : branch.status,
        });
      }
      if (
        request.method === "POST" &&
        (match = url.pathname.match(/^\/api\/agents\/([^/]+)\/branches$/))
      ) {
        return sendJson(response, 201, await service.createBranch(match[1]));
      }
      if (
        request.method === "POST" &&
        (match = url.pathname.match(/^\/api\/branches\/([^/]+)\/messages$/))
      ) {
        const body = await readJson(request);
        return sendJson(response, 200, await service.sendMessage(match[1], body.message));
      }
      if (
        request.method === "POST" &&
        (match = url.pathname.match(/^\/api\/branches\/([^/]+)\/end$/))
      ) {
        return sendJson(response, 200, await service.endBranch(match[1]));
      }
      if (request.method === "GET" && (match = url.pathname.match(/^\/api\/branches\/([^/]+)$/))) {
        return sendJson(response, 200, await service.getBranch(match[1]));
      }
      return sendJson(response, 404, { error: { code: "not_found", message: "Not found" } });
    } catch (error) {
      const status = error instanceof AaasError ? error.status : 500;
      const code = error instanceof AaasError ? error.code : "internal_error";
      const message = status === 500 && code === "internal_error" ? "Internal server error" : error.message;
      return sendJson(response, status, { error: { code, message } });
    }
  });

  return {
    service,
    listen(port, host) {
      return new Promise((resolve, reject) => {
        nodeServer.once("error", reject);
        nodeServer.listen(port, host, resolve);
      });
    },
    address() {
      return nodeServer.address();
    },
    close() {
      return new Promise((resolve, reject) => {
        nodeServer.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
