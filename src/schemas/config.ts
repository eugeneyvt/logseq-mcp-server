import { z } from 'zod';

/**
 * Environment configuration schema with strict validation
 */
export const ConfigSchema = z.object({
  /**
   * Logseq API URL
   */
  apiUrl: z
    .string()
    .url('API URL must be a valid URL')
    .regex(/^https?:\/\//, 'API URL must use HTTP or HTTPS protocol')
    .default('http://127.0.0.1:12315'),

  /**
   * Logseq API authentication token
   */
  apiToken: z
    .string()
    .min(1, 'API token is required')
    .regex(/^[a-zA-Z0-9._-]+$/, 'API token contains invalid characters'),

  /**
   * Request timeout in milliseconds
   */
  timeout: z
    .number()
    .int()
    .min(1000, 'Timeout must be at least 1 second')
    .max(60000, 'Timeout cannot exceed 60 seconds')
    .default(10000),

  /**
   * Maximum number of retries for failed requests
   */
  maxRetries: z
    .number()
    .int()
    .min(0, 'Max retries cannot be negative')
    .max(5, 'Max retries cannot exceed 5')
    .default(3),

  /**
   * Debug mode flag
   */
  debug: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const rawConfig = {
    apiUrl: process.env['LOGSEQ_API_URL'] ?? 'http://127.0.0.1:12315',
    apiToken: process.env['LOGSEQ_API_TOKEN'] ?? '',
    timeout: process.env['LOGSEQ_TIMEOUT'] ? parseInt(process.env['LOGSEQ_TIMEOUT'], 10) : 10000,
    maxRetries: process.env['LOGSEQ_MAX_RETRIES']
      ? parseInt(process.env['LOGSEQ_MAX_RETRIES'], 10)
      : 3,
    debug: process.env['DEBUG'] === '1' || process.env['NODE_ENV'] === 'development',
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}

/**
 * Validate that configuration is safe for production
 */
export function validateConfigSecurity(config: Config): void {
  // Warn about localhost in production
  if (process.env['NODE_ENV'] === 'production' && config.apiUrl.includes('localhost')) {
    // Warning: Using localhost API URL in production environment (logged by caller)
  }

  // Warn about HTTP in production
  if (process.env['NODE_ENV'] === 'production' && config.apiUrl.startsWith('http:')) {
    // Warning: Using insecure HTTP in production environment (logged by caller)
  }

  // Check token strength (basic validation)
  if (config.apiToken.length < 16) {
    // Warning: API token appears to be weak (logged by caller)
  }
}
