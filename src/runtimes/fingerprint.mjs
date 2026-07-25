import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

export async function fingerprintFile(file) {
  if (!file) return "unavailable";
  const metadata = await stat(file);
  const content = await readFile(file);
  return createHash("sha256")
    .update(String(metadata.size))
    .update("\0")
    .update(content)
    .digest("hex");
}
