/**
 * System Entity Module
 * Complete system information and monitoring functionality
 */

// Core types and utilities
export type {
  SystemInfoCategory,
  HealthStatus,
  GraphStatistics,
  PerformanceMetrics,
  SystemCapabilities,
  HealthCheckResult,
  SystemInfo
} from './core.js';

export {
  calculateGraphDensity,
  determineHealthStatus,
  calculateAverageResponseTime,
  calculatePercentile,
  formatUptime,
  validateSystemInfo,
  createDefaultSystemInfo
} from './core.js';

// Information gathering
export {
  collectSystemInfo,
  collectGraphStatistics,
  collectPerformanceMetrics,
  getSystemCapabilities,
  performHealthChecks,
  getSystemInfoCategory
} from './info.js';