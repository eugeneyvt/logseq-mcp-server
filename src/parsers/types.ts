export interface LogseqBlock {
  content: string;
  children?: LogseqBlock[];
}

export interface BlockNode {
  text: string;
  children: BlockNode[];
}

export interface ParsedBlock {
  content: string;
  type: 'text' | 'list' | 'heading' | 'code' | 'quote';
  level?: number;
  children?: ParsedBlock[];
}

export type RenderMode = 'readable' | 'compact';

export type MdNode = {
  type?: string;
  value?: string;
  children?: unknown[];
  lang?: string;
  url?: string;
  alt?: string;
};

