/**
 * Error Formatting Utilities
 * Centralized error formatting to avoid [object Object] issues
 */

/**
 * Safely format an error into a human-readable string
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    // Check if it has a message property
    if ('message' in error) {
      return String((error as { message: unknown }).message);
    }
    
    // Check if it has a reason property
    if ('reason' in error) {
      return String((error as { reason: unknown }).reason);
    }
    
    // Check if it has a toString method
    if (typeof (error as Record<string, unknown>).toString === 'function') {
      const strResult = String((error as Record<string, unknown>).toString?.());
      if (strResult !== '[object Object]') {
        return strResult;
      }
    }
    
    // Try JSON.stringify as last resort
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error object';
    }
  }
  
  return String(error);
}

/**
 * Create a detailed error message with context
 */
export function formatErrorWithContext(error: unknown, operation?: string, context?: Record<string, unknown>): string {
  const baseMessage = formatError(error);
  const parts = [];
  
  if (operation) {
    parts.push(`Operation: ${operation}`);
  }
  
  if (context) {
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
    parts.push(`Context: ${contextStr}`);
  }
  
  parts.push(`Error: ${baseMessage}`);
  
  return parts.join(' | ');
}