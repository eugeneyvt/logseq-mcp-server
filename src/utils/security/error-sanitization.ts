/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove file paths and other sensitive information
    return error.message
      .replace(/\/[^\s]+/g, '[PATH]') // Remove file paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // Remove IP addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]') // Remove emails
      .replace(/\b[a-f0-9]{8,}\b/gi, '[HASH]'); // Remove potential hashes/tokens (8+ hex chars)
  }

  return 'An error occurred';
}