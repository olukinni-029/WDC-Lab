import { redisClient } from "./redis"; 

interface RateLimitOptions {
  key: string;           // Redis key (e.g. `otp_resend_limit:<id>:purpose`)
  limit: number;         // Max allowed attempts
  ttlSeconds: number;    // Expiry time in seconds
}

export async function checkRateLimit(options: RateLimitOptions): Promise<{
  allowed: boolean;
  remaining: number;
  ttl?: number;
}> {
  const { key, limit, ttlSeconds } = options;

  const currentRaw = await redisClient.get(key);
  const current = typeof currentRaw === "string" ? currentRaw : null;

  if (current && parseInt(current) >= limit) {
    const ttl = await redisClient.ttl(key); // returns seconds
    return {
      allowed: false,
      remaining: 0,
      ttl,
    };
  }

  if (!current) {
    await redisClient.set(key, "1", { EX: ttlSeconds });
  } else {
    await redisClient.incr(key);
  }

  return {
    allowed: true,
    remaining: limit - (parseInt(current || "0") + 1),
  };
}
