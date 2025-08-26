
// Simple ValidationError class
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Content Security Policy headers for HTTP responses
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
} as const;

/**
 * Validate configuration values for security
 */
export function validateConfig(config: Record<string, unknown>): void {
  // Check for insecure configurations
  if (typeof config.apiUrl === 'string') {
    if (
      config.apiUrl.startsWith('http://') &&
      !config.apiUrl.includes('localhost') &&
      !config.apiUrl.includes('127.0.0.1')
    ) {
      throw new ValidationError('API URL should use HTTPS in production');
    }
  }

  if (typeof config.debug === 'boolean' && config.debug) {
    // Note: We don't log here to avoid circular dependency with logger
    // The debug mode warning should be handled by the caller
  }
}