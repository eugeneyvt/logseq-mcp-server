/**
 * Delete Tool Types Module
 * Shared interfaces and types for delete operations
 */

export interface DeletionImpact {
  items_to_delete: Array<{
    id: string;
    type: string;
    title: string;
    dependencies?: string[];
  }>;
  cascaded_items: Array<{
    id: string;
    type: string;
    reason: string;
  }>;
  orphaned_references: string[];
  estimated_impact_score: number;
}

export interface ItemImpact {
  title: string;
  dependencies: string[];
  cascaded_items: Array<{ id: string; type: string; reason: string }>;
  orphaned_references: string[];
  impact_score: number;
}

export type LogseqBlock = {
  uuid: string;
  content?: string;
  parent?: { uuid: string };
  children?: LogseqBlock[];
  page?: { name: string };
};