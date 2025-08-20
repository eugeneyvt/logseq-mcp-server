/**
 * Generate a structural outline from flat content
 */
export function parseOutlineStructure(lines: string[]): Array<{
  content: string;
  level: number;
  children: number[];
}> {
  const structure: Array<{
    content: string;
    level: number;
    children: number[];
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }

    // Count indentation level (but warn about it since it should be structural)
    const indentMatch = lines[i].match(/^(\s*)/);
    const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;

    structure.push({
      content: line,
      level: indentLevel,
      children: [],
    });
  }

  // Build parent-child relationships
  for (let i = 0; i < structure.length; i++) {
    const current = structure[i];

    // Find children (next items with higher level)
    for (let j = i + 1; j < structure.length; j++) {
      const next = structure[j];

      if (next.level <= current.level) {
        break; // End of children
      }

      if (next.level === current.level + 1) {
        current.children.push(j);
      }
    }
  }

  return structure;
}