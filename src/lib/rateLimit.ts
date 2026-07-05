interface Bucket {
  tokens: number;
  updated: number;
}

export interface RateLimiter {
  take(key: string): boolean;
}

/**
 * In-memory per-key token bucket. Suitable for a single serverless instance;
 * limits abuse/cost without external state. Refills continuously over time.
 */
export function createRateLimiter(
  capacity = 5,
  refillPerSec = 5 / 60,
  now: () => number = Date.now,
): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    take(key: string): boolean {
      const t = now();
      const bucket = buckets.get(key) ?? { tokens: capacity, updated: t };
      const elapsedSec = (t - bucket.updated) / 1000;
      bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);
      bucket.updated = t;

      if (bucket.tokens < 1) {
        buckets.set(key, bucket);
        return false;
      }
      bucket.tokens -= 1;
      buckets.set(key, bucket);
      return true;
    },
  };
}
