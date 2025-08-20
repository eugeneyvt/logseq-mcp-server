/**
 * Extract tags and page references from content
 */
export function extractReferences(content: string): {
  pageLinks: string[];
  tags: string[];
  blockRefs: string[];
} {
  const pageLinks: string[] = [];
  const tags: string[] = [];
  const blockRefs: string[] = [];

  // Extract page links [[Page Name]]
  const pageMatches = content.match(/\[\[([^\]]+)\]\]/g);
  if (pageMatches) {
    pageLinks.push(...pageMatches.map((match) => match.slice(2, -2)));
  }

  // Extract tags #tag
  const tagMatches = content.match(/#[a-zA-Z][a-zA-Z0-9_-]*/g);
  if (tagMatches) {
    tags.push(...tagMatches.map((match) => match.slice(1)));
  }

  // Extract block references ((block-uuid))
  const blockMatches = content.match(/\(\(([a-f0-9-]+)\)\)/g);
  if (blockMatches) {
    blockRefs.push(...blockMatches.map((match) => match.slice(2, -2)));
  }

  return { pageLinks, tags, blockRefs };
}