import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

// Derives a unique 256-bit key per user via HKDF-SHA256.
// Same master key + different userId → completely different derived key.
function deriveUserKey(userId: string): Buffer {
  return Buffer.from(
    hkdfSync("sha256", getMasterKey(), userId, "financials:v1", 32)
  );
}

export function encrypt(plaintext: string, userId: string): string {
  const key = deriveUserKey(userId);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decrypt(ciphertext: string, userId: string): string {
  const key = deriveUserKey(userId);
  const [ivB64, tagB64, dataB64] = ciphertext.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
