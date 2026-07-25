import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  decryptSourceCapsule,
  encryptSourceCapsule,
} from "../src/capsule.mjs";

test("cloud source capsules are encrypted, authenticated, and lossless", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aaas-capsule-"));
  const snapshotPath = path.join(root, "source.jsonl");
  const sourceBytes = Buffer.from(
    '{"type":"session_meta","payload":{"id":"secret-session"}}\n',
  );
  await writeFile(snapshotPath, sourceBytes);
  const source = {
    provider: "codex",
    originalSessionId: "secret-session",
    snapshotPath,
    beforeTurnId: "turn-being-published",
  };
  const capsule = await encryptSourceCapsule(source, "runner-secret");

  assert.ok(!capsule.includes("secret-session"));
  const decoded = decryptSourceCapsule(capsule, "runner-secret");
  assert.equal(decoded.provider, "codex");
  assert.equal(decoded.originalSessionId, "secret-session");
  assert.equal(decoded.beforeTurnId, "turn-being-published");
  assert.deepEqual(decoded.content, await readFile(snapshotPath));
  assert.throws(
    () => decryptSourceCapsule(capsule, "wrong-runner-secret"),
    /authenticate data|Unsupported state/i,
  );
});
