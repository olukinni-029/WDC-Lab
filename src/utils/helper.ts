import crypto from "crypto";

export function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function maskValue(value: string, visibleDigits = 4): string {
  if (!value || value.length <= visibleDigits) return '*'.repeat(value.length);
  return '*'.repeat(value.length - visibleDigits) + value.slice(-visibleDigits);
}

export function generateAccountNumber(): string {
  // Ensures the first digit is not 0
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}


export function generateReferenceId(userId: string): string {
  // generate 13 random hex chars
  const unique = crypto.randomBytes(7) // 7 bytes = 14 hex chars
                     .toString("hex")
                     .slice(0, 11);
  return `WD-${userId}-${unique}`;
}
