import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import type { Node } from 'mdast';
import { visit } from 'unist-util-visit';
import { logger } from '../logger.js';
import type { ParsedBlock, ParseConfig } from './markdown-types.js';
import { DEFAULT_CONFIG } from './markdown-config.js';
import { extractLogseqSyntax, nodeToMarkdown } from './markdown-utils.js';
import {
  handleHeading,
  handleList,
  handleCode,
  handleTable,
  handleBlockquote,
  handleImage,
  handleThematicBreak,
  handleHtml,
  handleParagraph,
  handleDefault,
} from './node-handlers.js';
import { parseMarkdownWithFallback } from './fallback-parser.js';

/**
 * Parse markdown content using comprehensive AST processing
 */
export function parseMarkdownToBlocks(
  content: string,
  config: ParseConfig = DEFAULT_CONFIG
): ParsedBlock[] {
  try {
    // Set up extensions for enhanced parsing
    const ast = fromMarkdown(content, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });

    const blocks: ParsedBlock[] = [];

    // Add parent references for nesting calculation
    visit(ast, (node: Node, index: number | undefined, parent: Node | undefined) => {
      (node as { parent?: Node }).parent = parent;
    });

    // Process root children with comprehensive type handling
    if (ast.children) {
      for (const node of ast.children) {
        const nodeContent = nodeToMarkdown(node, config);
        const logseqSyntax = extractLogseqSyntax(nodeContent);

        let block: ParsedBlock | ParsedBlock[] | null = null;

        switch (node.type) {
          case 'heading':
            block = handleHeading(node, nodeContent, logseqSyntax);
            break;

          case 'list':
            block = handleList(node, config);
            break;

          case 'code':
            block = handleCode(node, nodeContent, logseqSyntax);
            break;

          case 'table':
            block = handleTable(node, nodeContent, logseqSyntax);
            break;

          case 'blockquote':
            block = handleBlockquote(nodeContent, logseqSyntax);
            break;

          case 'image':
            block = handleImage(node, nodeContent, logseqSyntax);
            break;

          case 'thematicBreak':
            block = handleThematicBreak();
            break;

          case 'html':
            block = handleHtml(nodeContent, logseqSyntax, config);
            break;

          case 'paragraph':
            block = handleParagraph(node, nodeContent, logseqSyntax);
            break;

          default:
            block = handleDefault(nodeContent, logseqSyntax);
            break;
        }

        // Handle the result - could be a single block, array of blocks, or null
        if (block) {
          if (Array.isArray(block)) {
            blocks.push(...block);
          } else {
            blocks.push(block);
          }
        }
      }
    }

    return blocks.filter((block) => block.content.trim().length > 0);
  } catch (error) {
    logger.warn(
      { error },
      'Failed to parse markdown with enhanced parser, falling back to simple parsing'
    );
    return parseMarkdownWithFallback(content);
  }
}
