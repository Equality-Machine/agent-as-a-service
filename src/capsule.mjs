import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";

function capsuleKey(token) {
  return createHash("sha256")
    .update("aaas-source-capsule\0")
    .update(token)
    .digest();
}

export async function encryptSourceCapsule(source, runnerToken) {
  const payload = gzipSync(
    Buffer.from(
      JSON.stringify({
        v: 1,
        provider: source.provider,
        originalSessionId: source.originalSessionId,
        beforeTurnId: source.beforeTurnId,
        templateSessionId: source.templateSessionId,
        content: (await readFile(source.snapshotPath)).toString("base64"),
      }),
    ),
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", capsuleKey(runnerToken), iv);
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptSourceCapsule(capsule, runnerToken) {
  const bytes = Buffer.from(capsule, "base64");
  if (bytes.length < 29) throw new Error("Encrypted source capsule is invalid");
  const iv = bytes.subarray(0, 12);
  const tag = bytes.subarray(12, 28);
  const ciphertext = bytes.subarray(28);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    capsuleKey(runnerToken),
    iv,
  );
  decipher.setAuthTag(tag);
  const payload = JSON.parse(
    gunzipSync(Buffer.concat([decipher.update(ciphertext), decipher.final()])).toString(
      "utf8",
    ),
  );
  if (payload.v !== 1 || !payload.provider || !payload.content) {
    throw new Error("Source capsule payload is invalid");
  }
  return {
    provider: payload.provider,
    originalSessionId: payload.originalSessionId,
    beforeTurnId: payload.beforeTurnId ?? null,
    templateSessionId: payload.templateSessionId ?? null,
    content: Buffer.from(payload.content, "base64"),
  };
}
