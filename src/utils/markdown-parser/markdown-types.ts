/**
 * Parsed block structure for Logseq
 */
export interface ParsedBlock {
  content: string;
  type:
    | 'heading'
    | 'list'
    | 'paragraph'
    | 'code'
    | 'table'
    | 'blockquote'
    | 'image'
    | 'thematic_break'
    | 'math'
    | 'html';
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
