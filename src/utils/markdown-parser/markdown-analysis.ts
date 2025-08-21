import { extractLogseqSyntax } from './markdown-utils.js';

/**
 * Extract all Logseq-specific elements from content for analysis
 */
export function analyzeLogseqContent(content: string) {
  const syntax = extractLogseqSyntax(content);

  return {
    hasPageLinks: !!syntax.pageLinks?.length,
    hasBlockRefs: !!syntax.blockRefs?.length,
    hasTags: !!syntax.tags?.length,
    hasProperties: !!syntax.properties && Object.keys(syntax.properties).length > 0,
    pageLinks: syntax.pageLinks || [],
    blockRefs: syntax.blockRefs || [],
    tags: syntax.tags || [],
    properties: syntax.properties || {},
    isLogseqFormatted: !!(
      syntax.pageLinks?.length ||
      syntax.blockRefs?.length ||
      syntax.tags?.length ||
      Object.keys(syntax.properties || {}).length
    ),
  };
}
