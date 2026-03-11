const Redis = require('ioredis');
const { ApiError } = require('../../utils/errors');

class RateLimiter {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    // Tier-based rate limits (requests per hour)
    this.tierLimits = {
      BASIC: 100,
      PROFESSIONAL: 500,
      ENTERPRISE: 1000
    };

    // Sliding window duration (1 hour in seconds)
    this.windowDuration = 3600;
  }

  /**
   * Middleware to enforce rate limiting based on customer tier
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // Skip rate limiting for health checks
        if (req.path === '/health') {
          return next();
        }

        // Require authentication
        if (!req.user || !req.user.customerId) {
          throw new ApiError('UNAUTHORIZED', 'Authentication required', 401);
        }

        const customerId = req.user.customerId;
        const tier = req.user.tier || 'BASIC';
        const limit = this.tierLimits[tier];

        // Check rate limit
        const allowed = await this.checkRateLimit(customerId, limit);

        if (!allowed) {
          // Get current usage for response headers
          const usage = await this.getCurrentUsage(customerId);

          res.set({
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + this.windowDuration * 1000).toISOString()
          });

          throw new ApiError(
            'RATE_LIMIT_EXCEEDED',
            `Rate limit exceeded. Limit: ${limit} requests per hour. Current usage: ${usage}`,
            429
          );
        }

        // Get remaining requests for response headers
        const usage = await this.getCurrentUsage(customerId);
        const remaining = Math.max(0, limit - usage);

        res.set({
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + this.windowDuration * 1000).toISOString()
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if request is within rate limit using sliding window algorithm
   */
  async checkRateLimit(customerId, limit) {
    const now = Date.now();
    const windowStart = now - (this.windowDuration * 1000);
    const key = `ratelimit:${customerId}`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove old entries outside the sliding window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      pipeline.zcard(key);

      // Add current request timestamp
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiry on key (cleanup)
      pipeline.expire(key, this.windowDuration);

      const results = await pipeline.exec();

      // Get count from zcard result (index 1, value at index 1)
      const count = results[1][1];

      // Allow if count is less than limit
      return count < limit;
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if Redis is down
      return true;
    }
  }

  /**
   * Get current usage count for customer
   */
  async getCurrentUsage(customerId) {
    const now = Date.now();
    const windowStart = now - (this.windowDuration * 1000);
    const key = `ratelimit:${customerId}`;

    try {
      const count = await this.redis.zcount(key, windowStart, now);
      return count;
    } catch (error) {
      console.error('Get usage error:', error);
      return 0;
    }
  }

  /**
   * Reset rate limit for customer (admin function)
   */
  async resetRateLimit(customerId) {
    const key = `ratelimit:${customerId}`;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Reset rate limit error:', error);
      return false;
    }
  }

  /**
   * Get rate limit stats for customer
   */
  async getRateLimitStats(customerId, tier) {
    const limit = this.tierLimits[tier] || this.tierLimits.BASIC;
    const usage = await this.getCurrentUsage(customerId);
    const remaining = Math.max(0, limit - usage);
    const resetTime = new Date(Date.now() + this.windowDuration * 1000);

    return {
      limit,
      usage,
      remaining,
      resetTime,
      tier
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    await this.redis.quit();
  }
}

module.exports = RateLimiter;