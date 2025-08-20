import { logger } from '../logger.js';
import { metrics } from './metrics.js';

/**
 * Log metrics periodically
 */
export function startMetricsLogging(intervalMs = 300000): void {
  setInterval(() => {
    const summary = metrics.getSummary();
    logger.info({ metrics: summary }, 'Performance metrics summary');
  }, intervalMs);
}