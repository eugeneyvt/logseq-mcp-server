/**
 * System Entity Information
 * System information gathering and reporting
 */

import type { PerformanceAwareLogseqClient } from '../../adapters/client.js';
import { logger } from '../../utils/system/logger.js';
import type { 
  SystemInfo, 
  GraphStatistics, 
  PerformanceMetrics, 
  SystemCapabilities,
  HealthCheckResult,
  HealthStatus,
  SystemInfoCategory 
} from './core.js';
import { 
  calculateGraphDensity, 
  createDefaultSystemInfo,
} from './core.js';

/**
 * Collect comprehensive system information
 */
export async function collectSystemInfo(
  client: PerformanceAwareLogseqClient
): Promise<SystemInfo> {
  logger.debug('Collecting comprehensive system information');
  
  try {
    const systemInfo = createDefaultSystemInfo();
    
    // Collect graph statistics
    systemInfo.graph = await collectGraphStatistics(client);
    
    // Collect performance metrics (from monitoring service)
    systemInfo.performance = await collectPerformanceMetrics();
    
    // System capabilities are static
    systemInfo.capabilities = getSystemCapabilities();
    
    // Perform health checks
    systemInfo.health = await performHealthChecks(client);
    
    // Update diagnostics
    systemInfo.diagnostics.uptime = Date.now() - systemInfo.diagnostics.startTime;
    
    logger.debug({ 
      totalPages: systemInfo.graph.totalPages,
      totalBlocks: systemInfo.graph.totalBlocks,
      healthStatus: systemInfo.health.status 
    }, 'System information collected');
    
    return systemInfo;
    
  } catch (error) {
    logger.error({ error }, 'Failed to collect system information');
    throw error;
  }
}

/**
 * Collect graph statistics
 */
export async function collectGraphStatistics(
  client: PerformanceAwareLogseqClient
): Promise<GraphStatistics> {
  logger.debug('Collecting graph statistics');
  
  try {
    // Get all pages
    const allPages = await client.getAllPagesCached();
    const totalPages = allPages.length;
    
    let totalBlocks = 0;
    let totalConnections = 0;
    let journalPages = 0;
    let templateCount = 0;
    let orphanedPages = 0;
    
    // Analyze each page
    for (const page of allPages) {
      // Count journal pages
      if (page['journal?']) {
        journalPages++;
      }
      
      // Count templates (simplified detection)
      if (page.name.toLowerCase().includes('template') || 
          (page.properties as Record<string, unknown>)?.template === true) {
        templateCount++;
      }
      
      // Get blocks for this page
      const pageBlocks = await client.getPageBlocksTreeCached(page.name);
      if (pageBlocks) {
        totalBlocks += pageBlocks.length;
        
        // Count connections (references)
        for (const block of pageBlocks) {
          if (block.content) {
            // Count page references [[Page]]
            const pageRefMatches = block.content.match(/\[\[[^\]]+\]\]/g);
            totalConnections += pageRefMatches?.length || 0;
            
            // Count block references ((uuid))
            const blockRefMatches = block.content.match(/\(\([a-f0-9-]{36}\)\)/g);
            totalConnections += blockRefMatches?.length || 0;
          }
        }
      } else {
        // Page has no blocks - might be orphaned
        orphanedPages++;
      }
    }
    
    const avgBlocksPerPage = totalPages > 0 ? totalBlocks / totalPages : 0;
    const graphDensity = calculateGraphDensity(totalPages, totalConnections);
    
    const statistics: GraphStatistics = {
      totalPages,
      totalBlocks,
      totalConnections,
      journalPages,
      templateCount,
      orphanedPages,
      avgBlocksPerPage: Math.round(avgBlocksPerPage * 100) / 100,
      graphDensity: Math.round(graphDensity * 10000) / 10000,
      lastUpdated: Date.now()
    };
    
    logger.debug(statistics, 'Graph statistics collected');
    return statistics;
    
  } catch (error) {
    logger.error({ error }, 'Failed to collect graph statistics');
    throw error;
  }
}

/**
 * Collect performance metrics
 */
export async function collectPerformanceMetrics(): Promise<PerformanceMetrics> {
  // This would typically collect from a monitoring service
  // For now, return mock data
  return {
    responseTime: {
      avg: 150,
      p95: 300,
      p99: 500
    },
    cacheHitRate: 0.85,
    operationsPerSecond: 10.5,
    errorRate: 0.02,
    lastMeasured: Date.now()
  };
}

/**
 * Get system capabilities
 */
export function getSystemCapabilities(): SystemCapabilities {
  return {
    supportedOperations: [
      'search',
      'get', 
      'edit',
      'delete'
    ],
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
  };
}

/**
 * Perform system health checks
 */
export async function performHealthChecks(
  client: PerformanceAwareLogseqClient
): Promise<HealthCheckResult> {
  logger.debug('Performing health checks');
  
  const checks: HealthCheckResult['checks'] = [];
  let overallStatus: HealthStatus = 'healthy';
  
  try {
    // Check Logseq connectivity
    const connectivityStart = Date.now();
    try {
      await client.underlyingClient.callApi('logseq.App.getInfo', []);
      checks.push({
        name: 'logseq_connectivity',
        status: 'healthy',
        message: 'Successfully connected to Logseq',
        duration: Date.now() - connectivityStart
      });
    } catch (error) {
      checks.push({
        name: 'logseq_connectivity',
        status: 'critical',
        message: `Failed to connect to Logseq: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - connectivityStart
      });
      overallStatus = 'critical';
    }
    
    // Check cache performance
    const cacheStart = Date.now();
    try {
      await client.getAllPagesCached(); // Test cache performance
      const cacheHitTime = Date.now() - cacheStart;
      
      if (cacheHitTime < 100) {
        checks.push({
          name: 'cache_performance',
          status: 'healthy',
          message: 'Cache performing well',
          duration: cacheHitTime
        });
      } else if (cacheHitTime < 500) {
        checks.push({
          name: 'cache_performance',
          status: 'warning',
          message: 'Cache performance degraded',
          duration: cacheHitTime
        });
        if (overallStatus === 'healthy') {overallStatus = 'warning';}
      } else {
        checks.push({
          name: 'cache_performance',
          status: 'critical',
          message: 'Cache performance poor',
          duration: cacheHitTime
        });
        overallStatus = 'critical';
      }
    } catch (error) {
      checks.push({
        name: 'cache_performance',
        status: 'critical',
        message: `Cache check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - cacheStart
      });
      overallStatus = 'critical';
    }
    
    // Check memory usage
    if (process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (memoryMB < 100) {
        checks.push({
          name: 'memory_usage',
          status: 'healthy',
          message: `Memory usage: ${memoryMB}MB`
        });
      } else if (memoryMB < 500) {
        checks.push({
          name: 'memory_usage',
          status: 'warning',
          message: `Memory usage high: ${memoryMB}MB`
        });
        if (overallStatus === 'healthy') {overallStatus = 'warning';}
      } else {
        checks.push({
          name: 'memory_usage',
          status: 'critical',
          message: `Memory usage critical: ${memoryMB}MB`
        });
        overallStatus = 'critical';
      }
    }
    
    const result: HealthCheckResult = {
      status: overallStatus,
      checks,
      overallMessage: `System is ${overallStatus}`,
      timestamp: Date.now()
    };
    
    logger.debug({ status: overallStatus, checkCount: checks.length }, 'Health checks completed');
    return result;
    
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    
    return {
      status: 'critical',
      checks: [{
        name: 'health_check',
        status: 'critical',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      overallMessage: 'Health check system failure',
      timestamp: Date.now()
    };
  }
}

/**
 * Get specific system information category
 */
export async function getSystemInfoCategory(
  client: PerformanceAwareLogseqClient,
  category: SystemInfoCategory
): Promise<unknown> {
  logger.debug({ category }, 'Getting system info category');
  
  try {
    switch (category) {
      case 'graph':
        return await collectGraphStatistics(client);
        
      case 'performance':
        return await collectPerformanceMetrics();
        
      case 'config':
        return {
          version: '2.0.0',
          environment: process.env['NODE_ENV'] || 'development',
          features: ['unified-tools', 'performance-monitoring', 'security-validation']
        };
        
      case 'health':
        return await performHealthChecks(client);
        
      case 'version':
        return {
          serverVersion: '2.0.0',
          nodeVersion: process.version,
          architecture: process.arch,
          platform: process.platform
        };
        
      case 'capabilities':
        return getSystemCapabilities();
        
      case 'diagnostics':
        return {
          uptime: process.uptime() * 1000,
          startTime: Date.now() - (process.uptime() * 1000),
          processId: process.pid,
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage()
        };
        
      default:
        throw new Error(`Unknown system info category: ${category}`);
    }
  } catch (error) {
    logger.error({ error, category }, 'Failed to get system info category');
    throw error;
  }
}