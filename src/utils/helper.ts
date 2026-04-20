import { generateKeyPair } from 'crypto';
import crypto from "crypto";

export function hashValue(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
}

export function maskValue(value: string, visibleDigits = 4): string {
    if (!value || value.length <= visibleDigits) return '*'.repeat(value.length);
    return '*'.repeat(value.length - visibleDigits) + value.slice(-visibleDigits);
}

export function generateAccountNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

export function generateReferenceId(userId: string): string {
    const unique = crypto.randomBytes(7)
        .toString("hex")
        .slice(0, 11);
    return `WD-${userId}-${unique}`;
}

export function verifyWebhook(req: any, secret: string) {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    const payload = JSON.stringify(req.body);

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

    return signature === expectedSignature;
}

export let headers = {
    "x-api-key": process.env.WDC_API_KEY as string,
    "merchant-id": process.env.MERCHANTID as string,
    "Content-Type": "application/json",
};

export function generateRsaKeyPairAsync(): Promise<{ publicKey: string; privateKey: string }> {
  return new Promise((resolve, reject) => {
    generateKeyPair(
      'rsa',
      {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          return reject(err);
        }
        resolve({ publicKey, privateKey });
      }
    );
  });
}
