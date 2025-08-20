/**
 * Base types and interfaces for Logseq entities
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
  readonly uuid?: string;
  readonly content: string;
  readonly properties?: Record<string, unknown>;
  readonly children?: LogseqBlock[];
  readonly page?: { readonly id: number; readonly name: string };
  readonly parent?: { readonly id: string | number };
  readonly left?: { readonly id: string | number };
  readonly format?: string;
  readonly refs?: Array<{ readonly id: number; readonly name: string }>;
  readonly pathRefs?: Array<{ readonly id: number }>;
  readonly level?: number;
  readonly 'journal?'?: boolean;
  readonly journalDay?: number;
}

/**
 * Logseq API response wrapper
 */
export interface LogseqApiResponse<T = unknown> {
  readonly status?: string;
  readonly data?: T;
  readonly error?: string;
}

/**
 * Standard error codes for operations
 */
export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  BAD_QUERY = 'BAD_QUERY',
  INTERNAL = 'INTERNAL',
}

/**
 * Standard response format
 */
export interface StandardResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    hint?: string;
  };
}