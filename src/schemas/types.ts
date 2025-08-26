/**
 * Essential Types for Logseq Entities
 * Enhanced with stronger type safety and zero-any approach
 */

/**
 * Logseq page interface
 */
export interface LogseqPage {
  readonly id: number;
  readonly name: string;
  readonly originalName: string;
  readonly 'journal?'?: boolean;
  readonly journalDay?: number;
  readonly createdAt?: number;
  readonly updatedAt?: number;
  readonly uuid?: string;
  readonly format?: string;
  readonly file?: { readonly id: number };
  readonly properties?: Record<string, unknown>;
}

/**
 * Logseq block interface
 */
export interface LogseqBlock {
  readonly id: string | number;
  readonly uuid: string;
  readonly content: string;
  readonly properties?: Record<string, unknown>;
  readonly children?: LogseqBlock[];
  readonly page?: { name: string; originalName: string };
  readonly parent?: { id: string | number; uuid: string };
  readonly left?: { id: string | number; uuid: string };
  readonly format?: string;
  readonly 'created-at'?: number;
  readonly 'updated-at'?: number;
  readonly refs?: Array<{ id: number; name: string }>;
}

/**
 * Template interface (specialized page type)
 */
export interface LogseqTemplate extends LogseqPage {
  readonly templateName?: string;
  readonly placeholders?: string[];
  readonly variables?: Record<string, unknown>;
}

/**
 * Enhanced property types
 */
export type LogseqProperty = string | number | boolean | string[] | number[];

/**
 * API Response wrapper types
 */
export type LogseqApiResponse<T = unknown> = T;
export type LogseqPageArray = LogseqApiResponse<LogseqPage[]>;
export type LogseqBlockArray = LogseqApiResponse<LogseqBlock[]>;

/**
 * Utility type for dynamic property access
 */
export type LogseqEntity = LogseqPage | LogseqBlock;

/**
 * Strong type guard for LogseqPage
 */
export function isLogseqPage(obj: unknown): obj is LogseqPage {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const page = obj as Record<string, unknown>;
  return (
    typeof page.id === 'number' &&
    typeof page.name === 'string' &&
    (page['journal?'] === undefined || typeof page['journal?'] === 'boolean') &&
    (page.properties === undefined || typeof page.properties === 'object')
  );
}

/**
 * Strong type guard for LogseqBlock
 */
export function isLogseqBlock(obj: unknown): obj is LogseqBlock {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const block = obj as Record<string, unknown>;
  return (
    typeof block.uuid === 'string' &&
    typeof block.content === 'string' &&
    (block.properties === undefined || typeof block.properties === 'object') &&
    (block.children === undefined || Array.isArray(block.children))
  );
}

/**
 * Type guard for LogseqTemplate
 */
export function isLogseqTemplate(obj: unknown): obj is LogseqTemplate {
  if (!isLogseqPage(obj)) {
    return false;
  }
  const page = obj as LogseqPage & Record<string, unknown>;
  return Boolean(
    page.name &&
    (String(page.name).toLowerCase().includes('template') ||
     (page.properties as Record<string, unknown>)?.template === true ||
     (page.properties as Record<string, unknown>)?.['page-type'] === 'template')
  );
}

/**
 * Type guard for arrays of LogseqPages
 */
export function isLogseqPageArray(obj: unknown): obj is LogseqPage[] {
  return Array.isArray(obj) && obj.every(item => isLogseqPage(item));
}

/**
 * Type guard for arrays of LogseqBlocks
 */
export function isLogseqBlockArray(obj: unknown): obj is LogseqBlock[] {
  return Array.isArray(obj) && obj.every(item => isLogseqBlock(item));
}

/**
 * Safe property accessor
 */
export function getEntityProperty<T = LogseqProperty>(
  entity: LogseqEntity,
  key: string
): T | undefined {
  const properties = entity.properties;
  if (!properties || typeof properties !== 'object') {
    return undefined;
  }
  return (properties as Record<string, unknown>)[key] as T | undefined;
}

/**
 * Safe entity identification
 */
export function getEntityId(entity: LogseqEntity): string | number {
  if ('uuid' in entity && entity.uuid) {
    return entity.uuid;
  }
  return entity.id;
}

/**
 * Safe entity name/content access
 */
export function getEntityDisplay(entity: LogseqEntity): string {
  return 'name' in entity ? entity.name : entity.content;
}