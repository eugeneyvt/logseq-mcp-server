/**
 * Validate API token format
 */
export function validateApiToken(token: string): boolean {
  // Basic validation - token should be alphanumeric with dots, underscores, hyphens
  const tokenRegex = /^[a-zA-Z0-9._-]+$/;

  if (!tokenRegex.test(token)) {
    return false;
  }

  // Token should be reasonably long
  if (token.length < 8) {
    return false;
  }

  return true;
}