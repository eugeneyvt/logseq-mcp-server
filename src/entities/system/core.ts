/**
 * System Entity Core
 * Core data structures and utilities for system information
 */


/**
 * System information categories
 */
export type SystemInfoCategory = 
  | 'graph'        // Graph statistics
  | 'performance'  // Performance metrics
  | 'config'       // Configuration info
  | 'health'       // System health
  | 'version'      // Version information
  | 'capabilities' // Server capabilities
  | 'diagnostics'; // Diagnostic information

/**
 * System health status
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

/**
 * Graph statistics
 */
export interface GraphStatistics {
  totalPages: number;
  totalBlocks: number;
  totalConnections: number;
  journalPages: number;
  templateCount: number;
  orphanedPages: number;
  avgBlocksPerPage: number;
  graphDensity: number;
  lastUpdated: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  cacheHitRate: number;
  operationsPerSecond: number;
  errorRate: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  lastMeasured: number;
}

/**
 * System capabilities
 */
export interface SystemCapabilities {
  supportedOperations: string[];
  maxRequestSize: number;
  maxResponseSize: number;
  supportedFormats: string[];
  features: {
    caching: boolean;
    monitoring: boolean;
    rateLimit: boolean;
    batch: boolean;
  };
  version: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  checks: Array<{
    name: string;
    status: HealthStatus;
    message?: string;
    duration?: number;
  }>;
  overallMessage?: string;
  timestamp: number;
}

/**
 * Comprehensive system information
 */
export interface SystemInfo {
  graph: GraphStatistics;
  performance: PerformanceMetrics;
  capabilities: SystemCapabilities;
  health: HealthCheckResult;
  config: {
    version: string;
    environment: string;
    features: string[];
  };
  diagnostics: {
    uptime: number;
    startTime: number;
    processId?: number;
    nodeVersion?: string;
  };
}

/**
 * Calculate graph density metric
 */
export function calculateGraphDensity(
  totalPages: number, 
  totalConnections: number
): number {
  if (totalPages <= 1) {return 0;}
  
  // Maximum possible connections in a directed graph
  const maxConnections = totalPages * (totalPages - 1);
  return totalConnections / maxConnections;
}

/**
 * Determine health status from metrics
 */
export function determineHealthStatus(
  responseTime: number,
  errorRate: number,
  cacheHitRate: number
): HealthStatus {
  // Critical conditions
  if (errorRate > 0.1 || responseTime > 5000) {
    return 'critical';
  }
  
  // Warning conditions
  if (errorRate > 0.05 || responseTime > 2000 || cacheHitRate < 0.5) {
    return 'warning';
  }
  
  return 'healthy';
}

/**
 * Calculate average response time from samples
 */
export function calculateAverageResponseTime(samples: number[]): number {
  if (samples.length === 0) {return 0;}
  
  const sum = samples.reduce((acc, val) => acc + val, 0);
  return sum / samples.length;
}

/**
 * Calculate percentile from sorted samples
 */
export function calculatePercentile(sortedSamples: number[], percentile: number): number {
  if (sortedSamples.length === 0) {return 0;}
  
  const index = Math.ceil((percentile / 100) * sortedSamples.length) - 1;
  return sortedSamples[Math.max(0, Math.min(index, sortedSamples.length - 1))];
}

/**
 * Format uptime duration
 */
export function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Validate system info completeness
 */
export function validateSystemInfo(info: Partial<SystemInfo>): string[] {
  const errors: string[] = [];
  
  if (!info.graph) {
    errors.push('Graph statistics missing');
  } else {
    if (typeof info.graph.totalPages !== 'number' || info.graph.totalPages < 0) {
      errors.push('Invalid total pages count');
    }
    if (typeof info.graph.totalBlocks !== 'number' || info.graph.totalBlocks < 0) {
      errors.push('Invalid total blocks count');
    }
  }
  
  if (!info.performance) {
    errors.push('Performance metrics missing');
  } else {
    if (!info.performance.responseTime || 
        typeof info.performance.responseTime.avg !== 'number') {
      errors.push('Invalid response time metrics');
    }
  }
  
  if (!info.capabilities) {
    errors.push('System capabilities missing');
  } else {
    if (!Array.isArray(info.capabilities.supportedOperations)) {
      errors.push('Invalid supported operations list');
    }
  }
  
  if (!info.health) {
    errors.push('Health information missing');
  } else {
    if (!['healthy', 'warning', 'critical', 'unknown'].includes(info.health.status)) {
      errors.push('Invalid health status');
    }
  }
  
  return errors;
}

/**
 * Create default system info structure
 */
export function createDefaultSystemInfo(): SystemInfo {
  const now = Date.now();
  
  return {
    graph: {
      totalPages: 0,
      totalBlocks: 0,
      totalConnections: 0,
      journalPages: 0,
      templateCount: 0,
      orphanedPages: 0,
      avgBlocksPerPage: 0,
      graphDensity: 0,
      lastUpdated: now
    },
    performance: {
      responseTime: {
        avg: 0,
        p95: 0,
        p99: 0
      },
      cacheHitRate: 0,
      operationsPerSecond: 0,
      errorRate: 0,
      lastMeasured: now
    },
    capabilities: {
      supportedOperations: ['search', 'get', 'edit', 'delete'],
      maxRequestSize: 1024 * 1024, // 1MB
      maxResponseSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['json'],
      features: {
        caching: true,
        monitoring: true,
        rateLimit: true,
        batch: true
      },
      version: '2.0.0'
    },
    health: {
      status: 'unknown',
      checks: [],
      timestamp: now
    },
    config: {
      version: '2.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      features: ['unified-tools', 'performance-monitoring', 'security-validation']
    },
    diagnostics: {
      uptime: 0,
      startTime: now,
      processId: process.pid,
      nodeVersion: process.version
    }
  };
}