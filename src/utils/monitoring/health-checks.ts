/**
 * Health check status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: Record<
    string,
    {
      status: 'pass' | 'fail';
      message?: string;
      responseTime?: number;
    }
  >;
  uptime: number;
}

/**
 * Health check manager
 */
class HealthChecker {
  private readonly startTime = Date.now();
  private readonly checks: Map<
    string,
    () => Promise<{ status: 'pass' | 'fail'; message?: string }>
  > = new Map();

  /**
   * Register a health check
   */
  addCheck(
    name: string,
    check: () => Promise<{ status: 'pass' | 'fail'; message?: string }>
  ): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [name, check] of this.checks.entries()) {
      const start = Date.now();
      try {
        const result = await Promise.race([
          check(),
          new Promise<{ status: 'fail'; message: string }>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          ),
        ]);

        const responseTime = Date.now() - start;
        checks[name] = {
          status: result.status,
          message: result.message,
          responseTime,
        };

        if (result.status === 'fail') {
          overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
        }
      } catch (error) {
        const responseTime = Date.now() - start;
        checks[name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      uptime: Date.now() - this.startTime,
    };
  }
}

/**
 * Global health checker instance
 */
export const healthChecker = new HealthChecker();