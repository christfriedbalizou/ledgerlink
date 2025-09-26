import "dotenv/config";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.PLAID_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-cbc";

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.warn(
    'PLAID_ENCRYPTION_KEY missing or invalid (needs 32 bytes). Generate with: crypto.randomBytes(32).toString("hex")',
  );
  process.exit(1);
}

function encryptToken(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "utf-8"),
    iv,
  );
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decryptToken(encryptedToken) {
  const parts = encryptedToken.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted token format.");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encryptedData = parts[1];
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "utf-8"),
    iv,
  );
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export { encryptToken, decryptToken };
