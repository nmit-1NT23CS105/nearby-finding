type Bucket = {
  count: number;
  resetAt: number;
};

export class InMemoryRateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  check(key: string) {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || now > current.resetAt) {
      const resetAt = now + this.windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt
      };
    }

    if (current.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: current.resetAt
      };
    }

    current.count += 1;

    return {
      allowed: true,
      remaining: this.maxRequests - current.count,
      resetAt: current.resetAt
    };
  }
}
