/**
 * Rate limiting by IP/client identifier
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  clientId: string,
  maxRequests = 100,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  let entry = rateLimitStore.get(clientId);

  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(clientId, entry);
  }

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime <= now) {
        rateLimitStore.delete(key);
      }
    }
  }

  const allowed = entry.count < maxRequests;

  if (allowed) {
    entry.count++;
  }

  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}