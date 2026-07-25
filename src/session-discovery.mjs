import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

async function jsonlFiles(root, output = []) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return output;
    throw error;
  }
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) await jsonlFiles(target, output);
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) output.push(target);
  }
  return output;
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((item) => item && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");
}

function usablePreview(text) {
  const cleaned =
    text
      ?.replace(/<recommended_plugins>[\s\S]*?<\/recommended_plugins>/g, " ")
      .replace(/<environment_context>[\s\S]*?<\/environment_context>/g, " ")
      .replace(/# AGENTS\.md instructions[\s\S]*?<!-- END agent-room rules -->/g, " ")
      .replace(/<context-pack[\s\S]*?<\/context-pack>/g, " ") ?? "";
  const value = cleaned.replace(/\s+/g, " ").trim();
  if (!value || value.startsWith("<environment_context>") || value.startsWith("<permissions")) {
    return "";
  }
  return value.slice(0, 180);
}

async function inspectSession(provider, file) {
  const metadata = await stat(file);
  const result = {
    provider,
    sessionId: provider === "claude" ? path.basename(file, ".jsonl") : null,
    cwd: null,
    path: file,
    preview: "",
    updatedAt: metadata.mtime.toISOString(),
    sizeBytes: metadata.size,
  };
  const lines = readline.createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let seen = 0;
  for await (const line of lines) {
    if (++seen > 120) break;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (provider === "codex") {
      if (event.type === "session_meta") {
        result.sessionId = event.payload?.id ?? event.payload?.session_id ?? result.sessionId;
        result.cwd = event.payload?.cwd ?? result.cwd;
      }
      if (
        !result.preview &&
        event.type === "response_item" &&
        event.payload?.type === "message" &&
        event.payload?.role === "user"
      ) {
        result.preview = usablePreview(textFromContent(event.payload.content));
      }
    } else {
      result.sessionId = event.sessionId ?? result.sessionId;
      result.cwd = event.cwd ?? result.cwd;
      if (!result.preview && event.type === "user") {
        result.preview = usablePreview(textFromContent(event.message?.content));
      }
    }
    if (result.sessionId && result.cwd && result.preview) break;
  }
  lines.close();
  return result.sessionId && result.cwd ? result : null;
}

export function defaultSessionRoots(provider) {
  if (provider === "codex") {
    return [
      path.join(os.homedir(), ".codex", "sessions"),
      path.join(os.homedir(), ".codex", "archived_sessions"),
    ];
  }
  if (provider === "claude") return [path.join(os.homedir(), ".claude", "projects")];
  return [];
}

export async function discoverSessions({
  provider,
  roots = defaultSessionRoots(provider),
  limit = 30,
}) {
  if (!["codex", "claude"].includes(provider)) return [];
  const files = [];
  for (const root of roots) await jsonlFiles(root, files);
  const recent = (
    await Promise.all(
      files.map(async (file) => ({ file, mtimeMs: (await stat(file)).mtimeMs })),
    )
  )
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, Math.max(limit * 3, limit));
  const sessions = (
    await Promise.all(recent.map(({ file }) => inspectSession(provider, file)))
  ).filter(Boolean);
  const unique = new Map();
  for (const session of sessions) {
    if (!unique.has(session.sessionId)) unique.set(session.sessionId, session);
  }
  return [...unique.values()].slice(0, limit);
}
