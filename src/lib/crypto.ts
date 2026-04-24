import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.OPENROUTER_KEY_ENCRYPTION_KEY;
  if (!raw) throw new Error("OPENROUTER_KEY_ENCRYPTION_KEY is required");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("OPENROUTER_KEY_ENCRYPTION_KEY must be 32 bytes base64");
  }
  return key;
}

/** Layout: [12-byte IV][ciphertext][16-byte auth tag]. */
export function encryptApiKey(plaintext: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]);
}

export function decryptApiKey(blob: Buffer): string {
  if (blob.length <= IV_LEN + TAG_LEN) throw new Error("ciphertext too short");
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(blob.length - TAG_LEN);
  const ct = blob.subarray(IV_LEN, blob.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
