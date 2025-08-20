import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import type { 
  Heading, 
  List, 
  ListItem, 
  Table, 
  TableCell, 
  Image,
  Node
} from 'mdast';
import { visit } from 'unist-util-visit';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { logger } from './logger.js';

/**
 * Parsed block structure for Logseq
 */
export interface ParsedBlock {
  content: string;
  type: 'heading' | 'list' | 'paragraph' | 'code' | 'table' | 'blockquote' | 'image' | 'thematic_break' | 'math' | 'html';
  level: number; // For headings: 1-6, for lists: nesting depth, for paragraphs: 0
  parentLevel?: number; // For nested items
  metadata?: {
    taskList?: boolean;
    checked?: boolean;
    language?: string;
    url?: string;
    alt?: string;
    tableHeaders?: string[];
    logseqSyntax?: {
      pageLinks?: string[];
      blockRefs?: string[];
      tags?: string[];
      properties?: Record<string, string>;
    };
  };
}

/**
 * Configuration for sanitization and parsing
 */
export interface ParseConfig {
  allowHtml?: boolean;
  preserveLogseqSyntax?: boolean;
  sanitizeHtml?: boolean;
  maxNestingLevel?: number;
}

const DEFAULT_CONFIG: ParseConfig = {
  allowHtml: true,
  preserveLogseqSyntax: true,
  sanitizeHtml: true,
  maxNestingLevel: 10
};

/**
 * Set up DOMPurify for server-side usage
 */
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Extract Logseq-specific syntax from text
 */
function extractLogseqSyntax(text: string) {
  const pageLinks = Array.from(text.matchAll(/\[\[([^\]]+)\]\]/g)).map(m => m[1]);
  const blockRefs = Array.from(text.matchAll(/\(\(([^)]+)\)\)/g)).map(m => m[1]);
  const tags = Array.from(text.matchAll(/#([\w-]+)/g)).map(m => m[1]);
  const properties: Record<string, string> = {};
  
  // Extract properties (key:: value)
  const propertyMatches = text.matchAll(/^([\w-]+)::\s*(.+)$/gm);
  for (const match of propertyMatches) {
    properties[match[1]] = match[2].trim();
  }
  
  const hasAny = pageLinks.length > 0 || blockRefs.length > 0 || tags.length > 0 || Object.keys(properties).length > 0;
  
  if (!hasAny) {
    return {};
  }
  
  return {
    pageLinks: pageLinks.length > 0 ? pageLinks : undefined,
    blockRefs: blockRefs.length > 0 ? blockRefs : undefined,
    tags: tags.length > 0 ? tags : undefined,
    properties: Object.keys(properties).length > 0 ? properties : undefined
  };
}

/**
 * Convert mdast node to markdown string representation with comprehensive support
 */
function nodeToMarkdown(node: unknown, config: ParseConfig = DEFAULT_CONFIG): string {
  const typedNode = node as { type: string; value?: string; children?: unknown[]; depth?: number; lang?: string; url?: string; alt?: string; title?: string; ordered?: boolean; checked?: boolean };
  
  switch (typedNode.type) {
    case 'text': {
      return typedNode.value || '';
    }
    
    case 'emphasis': {
      return `*${(typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('')}*`;
    }
    
    case 'strong': {
      return `**${(typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('')}**`;
    }
    
    case 'delete': { // Strikethrough
      return `~~${(typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('')}~~`;
    }
    
    case 'inlineCode': {
      return `\`${typedNode.value || ''}\``;
    }
    
    case 'code': {
      const language = typedNode.lang || '';
      return `\`\`\`${language}\n${typedNode.value || ''}\n\`\`\``;
    }
    
    // Math support - check if node has math value
    case 'math': {
      return `$$\n${typedNode.value || ''}\n$$`;
    }
    
    case 'inlineMath': {
      return `$${typedNode.value || ''}$`;
    }
    
    case 'link': {
      const linkText = (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('');
      return `[${linkText}](${typedNode.url || ''})`;
    }
    
    case 'image': {
      return `![${typedNode.alt || ''}](${typedNode.url || ''}${typedNode.title ? ` "${typedNode.title}"` : ''})`;
    }
    
    case 'heading': {
      const headingText = (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('');
      return '#'.repeat(typedNode.depth || 1) + ' ' + headingText;
    }
    
    case 'paragraph': {
      return (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('');
    }
    
    case 'blockquote': {
      const quoteContent = (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('\n');
      return quoteContent.split('\n').map((line: string) => `> ${line}`).join('\n');
    }
    
    case 'list': {
      return (typedNode.children || []).map((item: unknown, index: number) => {
        const marker = typedNode.ordered ? `${index + 1}.` : '-';
        const itemContent = nodeToMarkdown(item, config);
        return `${marker} ${itemContent}`;
      }).join('\n');
    }
    
    case 'listItem': {
      const itemText = (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('\n');
      // For task lists, don't include the checkbox in the content - it's handled in metadata
      return itemText;
    }
    
    case 'table': {
      const tableNode = typedNode as { children?: Array<{ children?: unknown[] }> };
      const headers = (tableNode.children?.[0]?.children || []).map((cell: unknown) => 
        nodeToMarkdown(cell, config).trim()
      ) || [];
      const headerRow = `| ${headers.join(' | ')} |`;
      const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
      
      const bodyRows = (tableNode.children || []).slice(1).map((row: unknown) => {
        const cells = (row as { children?: unknown[] }).children?.map((cell: unknown) => nodeToMarkdown(cell, config).trim()) || [];
        return `| ${cells.join(' | ')} |`;
      });
      
      return [headerRow, separatorRow, ...bodyRows].join('\n');
    }
    
    case 'tableRow':
    case 'tableCell': {
      return (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('');
    }
    
    case 'thematicBreak': {
      return '---';
    }
    
    case 'html': {
      if (config.allowHtml) {
        return config.sanitizeHtml ? purify.sanitize(typedNode.value || '') : typedNode.value || '';
      }
      return '';
    }
    
    case 'break': {
      return '\n';
    }
    
    default: {
      if (typedNode.children) {
        return (typedNode.children || []).map((n: unknown) => nodeToMarkdown(n, config)).join('');
      }
      return typedNode.value || '';
    }
  }
}


/**
 * Process list items with proper nesting and task list support
 */
function processListItems(listNode: List, parentLevel = 0, config: ParseConfig = DEFAULT_CONFIG): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  
  listNode.children.forEach((listItem: ListItem) => {
    const isTaskList = listItem.checked !== null && listItem.checked !== undefined;
    const level = parentLevel;
    
    // Extract main content
    let itemContent = '';
    const childBlocks: ParsedBlock[] = [];
    
    listItem.children.forEach(child => {
      if (child.type === 'paragraph') {
        itemContent += child.children.map(n => nodeToMarkdown(n, config)).join('');
      } else if (child.type === 'list') {
        // Nested list
        childBlocks.push(...processListItems(child as List, Math.min(level + 1, config.maxNestingLevel || 10), config));
      } else {
        itemContent += nodeToMarkdown(child, config);
      }
    });
    
    if (itemContent.trim()) {
      const logseqSyntax = extractLogseqSyntax(itemContent);
      
      const block: ParsedBlock = {
        content: itemContent.trim(),
        type: 'list',
        level: Math.min(level, config.maxNestingLevel || 10)
      };
      
      if (isTaskList || Object.keys(logseqSyntax).length > 0) {
        block.metadata = {};
        if (isTaskList) {
          block.metadata.taskList = true;
          block.metadata.checked = listItem.checked ?? undefined;
        }
        if (Object.keys(logseqSyntax).length > 0) {
          block.metadata.logseqSyntax = logseqSyntax;
        }
      }
      
      blocks.push(block);
    }
    
    // Add nested blocks
    blocks.push(...childBlocks);
  });
  
  return blocks;
}

/**
 * Parse markdown content using comprehensive AST processing
 */
export function parseMarkdownToBlocks(content: string, config: ParseConfig = DEFAULT_CONFIG): ParsedBlock[] {
  try {
    // Set up extensions for enhanced parsing
    const ast = fromMarkdown(content, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()]
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
        
        switch (node.type) {
          case 'heading': {
            const headingNode = node as Heading;
            const block: ParsedBlock = {
              content: nodeContent,
              type: 'heading',
              level: headingNode.depth
            };
            
            if (Object.keys(logseqSyntax).length > 0) {
              block.metadata = { logseqSyntax };
            }
            
            blocks.push(block);
            break;
          }
          
          case 'list': {
            const listBlocks = processListItems(node as List, 0, config);
            blocks.push(...listBlocks);
            break;
          }
          
          case 'code': {
            const codeNode = node as { lang?: string };
            if (nodeContent.trim()) {
              const block: ParsedBlock = {
                content: nodeContent.trim(),
                type: 'code',
                level: 0
              };
              
              // Always add metadata for code blocks to include language (even if empty)
              block.metadata = {
                language: codeNode.lang || ''
              };
              if (Object.keys(logseqSyntax).length > 0) {
                block.metadata.logseqSyntax = logseqSyntax;
              }
              
              blocks.push(block);
            }
            break;
          }
          
          case 'table': {
            const tableNode = node as Table;
            const headers = tableNode.children[0]?.children.map((cell: TableCell) => 
              nodeToMarkdown(cell, config).trim()
            ) || [];
            
            const block: ParsedBlock = {
              content: nodeContent,
              type: 'table',
              level: 0
            };
            
            if (headers.length > 0 || Object.keys(logseqSyntax).length > 0) {
              block.metadata = {};
              if (headers.length > 0) {
                block.metadata.tableHeaders = headers;
              }
              if (Object.keys(logseqSyntax).length > 0) {
                block.metadata.logseqSyntax = logseqSyntax;
              }
            }
            
            blocks.push(block);
            break;
          }
          
          case 'blockquote': {
            const block: ParsedBlock = {
              content: nodeContent,
              type: 'blockquote',
              level: 0
            };
            
            if (Object.keys(logseqSyntax).length > 0) {
              block.metadata = { logseqSyntax };
            }
            
            blocks.push(block);
            break;
          }
          
          case 'image': {
            const imageNode = node as Image;
            const block: ParsedBlock = {
              content: nodeContent,
              type: 'image',
              level: 0
            };
            
            if (imageNode.url || imageNode.alt || Object.keys(logseqSyntax).length > 0) {
              block.metadata = {};
              if (imageNode.url) {
                block.metadata.url = imageNode.url;
              }
              if (imageNode.alt) {
                block.metadata.alt = imageNode.alt;
              }
              if (Object.keys(logseqSyntax).length > 0) {
                block.metadata.logseqSyntax = logseqSyntax;
              }
            }
            
            blocks.push(block);
            break;
          }
          
          case 'thematicBreak': {
            blocks.push({
              content: '---',
              type: 'thematic_break',
              level: 0
            });
            break;
          }
          
          case 'html': {
            if (config.allowHtml && nodeContent.trim()) {
              const block: ParsedBlock = {
                content: nodeContent.trim(),
                type: 'html',
                level: 0
              };
              
              if (Object.keys(logseqSyntax).length > 0) {
                block.metadata = { logseqSyntax };
              }
              
              blocks.push(block);
            }
            break;
          }
          
          
          case 'paragraph': {
            if (nodeContent.trim()) {
              // Check if this paragraph contains only an image
              const paragraphNode = node as { children?: Array<{ type: string; url?: string; alt?: string }> };
              if (paragraphNode.children?.length === 1 && paragraphNode.children[0].type === 'image') {
                const imageNode = paragraphNode.children[0];
                const block: ParsedBlock = {
                  content: nodeContent.trim(),
                  type: 'image',
                  level: 0
                };
                
                if (imageNode.url || imageNode.alt || Object.keys(logseqSyntax).length > 0) {
                  block.metadata = {};
                  if (imageNode.url) {
                    block.metadata.url = imageNode.url;
                  }
                  if (imageNode.alt) {
                    block.metadata.alt = imageNode.alt;
                  }
                  if (Object.keys(logseqSyntax).length > 0) {
                    block.metadata.logseqSyntax = logseqSyntax;
                  }
                }
                
                blocks.push(block);
              } else {
                // Regular paragraph
                const block: ParsedBlock = {
                  content: nodeContent.trim(),
                  type: 'paragraph',
                  level: 0
                };
                
                if (Object.keys(logseqSyntax).length > 0) {
                  block.metadata = { logseqSyntax };
                }
                
                blocks.push(block);
              }
            }
            break;
          }
          
          default: {
            // Handle any other node types as paragraphs
            if (nodeContent.trim()) {
              const block: ParsedBlock = {
                content: nodeContent.trim(),
                type: 'paragraph',
                level: 0
              };
              
              if (Object.keys(logseqSyntax).length > 0) {
                block.metadata = { logseqSyntax };
              }
              
              blocks.push(block);
            }
            break;
          }
        }
      }
    }
    
    return blocks.filter(block => block.content.trim().length > 0);
    
  } catch (error) {
    logger.warn({ error }, 'Failed to parse markdown with enhanced parser, falling back to simple parsing');
    
    // Enhanced fallback parsing
    const lines = content.split('\n');
    const blocks: ParsedBlock[] = [];
    let currentBlock = '';
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Handle code blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          blocks.push({
            content: `\`\`\`${codeBlockLanguage}\n${currentBlock}\n\`\`\``,
            type: 'code',
            level: 0,
            metadata: { language: codeBlockLanguage }
          });
          currentBlock = '';
          inCodeBlock = false;
          codeBlockLanguage = '';
        } else {
          // Start of code block
          inCodeBlock = true;
          codeBlockLanguage = trimmed.slice(3).trim();
        }
        continue;
      }
      
      if (inCodeBlock) {
        currentBlock += (currentBlock ? '\n' : '') + line;
        continue;
      }
      
      // Handle other content
      if (!trimmed) {
        if (currentBlock.trim()) {
          blocks.push({
            content: currentBlock.trim(),
            type: 'paragraph',
            level: 0
          });
          currentBlock = '';
        }
        continue;
      }
      
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      const listMatch = trimmed.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
      const taskMatch = trimmed.match(/^(\s*)([-*+])\s+\[([ x])\]\s+(.+)$/);
      const blockquoteMatch = trimmed.match(/^>\s*(.*)$/);
      
      if (headingMatch) {
        if (currentBlock.trim()) {
          blocks.push({
            content: currentBlock.trim(),
            type: 'paragraph',
            level: 0
          });
          currentBlock = '';
        }
        
        const logseqSyntax = extractLogseqSyntax(trimmed);
        blocks.push({
          content: trimmed,
          type: 'heading',
          level: headingMatch[1].length,
          metadata: {
            logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined
          }
        });
      } else if (taskMatch) {
        if (currentBlock.trim()) {
          blocks.push({
            content: currentBlock.trim(),
            type: 'paragraph',
            level: 0
          });
          currentBlock = '';
        }
        
        const logseqSyntax = extractLogseqSyntax(taskMatch[4]);
        blocks.push({
          content: taskMatch[4].trim(),
          type: 'list',
          level: Math.floor(taskMatch[1].length / 2),
          metadata: {
            taskList: true,
            checked: taskMatch[3] === 'x',
            logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined
          }
        });
      } else if (listMatch) {
        if (currentBlock.trim()) {
          blocks.push({
            content: currentBlock.trim(),
            type: 'paragraph',
            level: 0
          });
          currentBlock = '';
        }
        
        const logseqSyntax = extractLogseqSyntax(listMatch[3]);
        blocks.push({
          content: listMatch[3].trim(),
          type: 'list',
          level: Math.floor(listMatch[1].length / 2),
          metadata: {
            logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined
          }
        });
      } else if (blockquoteMatch) {
        if (currentBlock.trim()) {
          blocks.push({
            content: currentBlock.trim(),
            type: 'paragraph',
            level: 0
          });
          currentBlock = '';
        }
        
        const logseqSyntax = extractLogseqSyntax(blockquoteMatch[1]);
        blocks.push({
          content: trimmed,
          type: 'blockquote',
          level: 0,
          metadata: {
            logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined
          }
        });
      } else if (trimmed === '---') {
        if (currentBlock.trim()) {
          blocks.push({
            content: currentBlock.trim(),
            type: 'paragraph',
            level: 0
          });
          currentBlock = '';
        }
        
        blocks.push({
          content: '---',
          type: 'thematic_break',
          level: 0
        });
      } else {
        currentBlock += (currentBlock ? '\n' : '') + line;
      }
    }
    
    // Handle final block
    if (currentBlock.trim()) {
      const logseqSyntax = extractLogseqSyntax(currentBlock);
      blocks.push({
        content: currentBlock.trim(),
        type: 'paragraph',
        level: 0,
        metadata: {
          logseqSyntax: Object.keys(logseqSyntax).length > 0 ? logseqSyntax : undefined
        }
      });
    }
    
    return blocks.filter(block => block.content.trim().length > 0);
  }
}

/**
 * Validate and clean markdown content before parsing
 */
export function validateMarkdownContent(content: string, config: ParseConfig = DEFAULT_CONFIG): string {
  let cleaned = content;
  
  if (config.sanitizeHtml) {
    // Remove or sanitize potentially dangerous HTML
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
    cleaned = cleaned.replace(/javascript:/gi, '');
    cleaned = cleaned.replace(/on\w+\s*=/gi, '');
  }
  
  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

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
    isLogseqFormatted: !!(syntax.pageLinks?.length || syntax.blockRefs?.length || syntax.tags?.length || Object.keys(syntax.properties || {}).length)
  };
}

/**
 * Convert parsed blocks back to markdown format
 */
export function blocksToMarkdown(blocks: ParsedBlock[]): string {
  return blocks.map(block => {
    let content = block.content;
    
    // Handle list items with proper indentation
    if (block.type === 'list' && block.level > 0) {
      const indent = '  '.repeat(block.level);
      content = indent + content;
    }
    
    return content;
  }).join('\n\n');
}

/**
 * Parse content with specific focus on preserving Logseq syntax
 */
export function parseLogseqMarkdown(content: string): ParsedBlock[] {
  const config: ParseConfig = {
    allowHtml: true,
    preserveLogseqSyntax: true,
    sanitizeHtml: true,
    maxNestingLevel: 10
  };
  
  const validated = validateMarkdownContent(content, config);
  return parseMarkdownToBlocks(validated, config);
}