import type { LogseqBlock } from './types.js';

export function normalizeTaskMarker(text: string): string {
  const m =
    text.match(/^\s*(?:[-*]|\d+\.)\s+?(?:[*_`]+)?\[(\s|x|X)?\](?:[*_`]+)?\s*(.*)$/) ||
    text.match(/^\s*(?:[*_`]+)?\[(\s|x|X)?\](?:[*_`]+)?\s*(.*)$/);
  if (!m) {
    return text;
  }
  const marker = m[1] || '';
  const status = String(marker).toLowerCase() === 'x' ? 'DONE' : 'TODO';
  const rest = m[2] || '';
  return `${status} ${rest}`;
}

export function preprocessTaskMarkersInMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    // With list marker (unordered or ordered)
    let m = line.match(/^\s*((?:[-*]|\d+\.)\s+)(?:[*_`]+)?\[(\s|x|X)?\](?:[*_`]+)?\s*(.*)$/);
    if (m) {
      const status = (m[2] || '').toLowerCase() === 'x' ? 'DONE' : 'TODO';
      out.push(`${m[1]}${status} ${m[3]}`.trimEnd());
      continue;
    }
    // Standalone checkbox at start of line
    m = line.match(/^\s*(?:[*_`]+)?\[(\s|x|X)?\](?:[*_`]+)?\s*(.*)$/);
    if (m) {
      const status = (m[1] || '').toLowerCase() === 'x' ? 'DONE' : 'TODO';
      if (out.length > 0 && out[out.length - 1].trim() !== '') {
        out.push('');
      }
      out.push(`${status} ${m[2]}`.trimEnd());
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

export function splitAndNormalizeTasksRecursively(block: LogseqBlock): LogseqBlock[] {
  const content = normalizeTaskMarker(block.content);
  const lines = content.split(/\r?\n/);
  const taskLine = /^(?:TODO|DOING|DONE|WAITING|LATER|NOW|CANCELED)\s+.+/;

  const taskLines = lines.filter((l) => taskLine.test(l.trim()));
  if (taskLines.length >= 2) {
    const blocks: LogseqBlock[] = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l, idx) => ({
        content: l,
        children:
          idx === 0
            ? block.children?.flatMap(splitAndNormalizeTasksRecursively).map((b) => ({ content: b.content, children: b.children })) || []
            : [],
      }));
    return blocks;
  }

  const children = block.children?.flatMap(splitAndNormalizeTasksRecursively);
  if (children && children.length > 0) {
    return [{ content, children }];
  }
  return [{ content }];
}
