import { describe, it, expect } from 'vitest';
import { 
  parseMarkdownToBlocks, 
  validateMarkdownContent, 
  analyzeLogseqContent,
  blocksToMarkdown,
  parseLogseqMarkdown,
  type ParsedBlock,
  type ParseConfig 
} from './markdown-parser.js';

describe('Enhanced Markdown Parser', () => {
  describe('Basic Content Types', () => {
    it('should parse headings correctly', () => {
      const content = `# Heading 1
## Heading 2
### Heading 3 with [[Page Link]]`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(3);
      expect(blocks[0]).toEqual({
        content: '# Heading 1',
        type: 'heading',
        level: 1
      });
      expect(blocks[1]).toEqual({
        content: '## Heading 2',
        type: 'heading',
        level: 2
      });
      expect(blocks[2]).toEqual({
        content: '### Heading 3 with [[Page Link]]',
        type: 'heading',
        level: 3,
        metadata: {
          logseqSyntax: {
            pageLinks: ['Page Link']
          }
        }
      });
    });

    it('should parse paragraphs with inline formatting', () => {
      const content = `This is a **bold** paragraph with *italic* text and \`inline code\`.

This is another paragraph with ~~strikethrough~~ text.`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toEqual({
        content: 'This is a **bold** paragraph with *italic* text and `inline code`.',
        type: 'paragraph',
        level: 0
      });
      expect(blocks[1]).toEqual({
        content: 'This is another paragraph with ~~strikethrough~~ text.',
        type: 'paragraph',
        level: 0
      });
    });

    it('should parse code blocks with language detection', () => {
      const content = `\`\`\`typescript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

\`\`\`
Plain code block
\`\`\``;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].content).toContain('```typescript');
      expect(blocks[0].content).toContain('function hello()');
      expect(blocks[0].type).toBe('code');
      expect(blocks[0].metadata?.language).toBe('typescript');
      expect(blocks[1].content).toContain('```');
      expect(blocks[1].content).toContain('Plain code block');
      expect(blocks[1].type).toBe('code');
      expect(blocks[1].metadata?.language).toBe('');
    });
  });

  describe('Lists and Task Lists', () => {
    it('should parse simple lists', () => {
      const content = `- Item 1
- Item 2 with [[Link]]
- Item 3

1. Ordered item 1
2. Ordered item 2`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(5);
      expect(blocks[0]).toEqual({
        content: 'Item 1',
        type: 'list',
        level: 0
      });
      expect(blocks[1]).toEqual({
        content: 'Item 2 with [[Link]]',
        type: 'list',
        level: 0,
        metadata: {
          logseqSyntax: {
            pageLinks: ['Link']
          }
        }
      });
    });

    it('should parse nested lists', () => {
      const content = `- Parent item 1
  - Child item 1
  - Child item 2
    - Grandchild item
- Parent item 2`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(5);
      expect(blocks[0]).toEqual({
        content: 'Parent item 1',
        type: 'list',
        level: 0
      });
      expect(blocks[1]).toEqual({
        content: 'Child item 1',
        type: 'list',
        level: 1
      });
      expect(blocks[2]).toEqual({
        content: 'Child item 2',
        type: 'list',
        level: 1
      });
      expect(blocks[3]).toEqual({
        content: 'Grandchild item',
        type: 'list',
        level: 2
      });
      expect(blocks[4]).toEqual({
        content: 'Parent item 2',
        type: 'list',
        level: 0
      });
    });

    it('should parse task lists', () => {
      const content = `- [ ] Unchecked task
- [x] Completed task
- [ ] Task with #tag`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(3);
      expect(blocks[0]).toEqual({
        content: 'Unchecked task',
        type: 'list',
        level: 0,
        metadata: {
          taskList: true,
          checked: false
        }
      });
      expect(blocks[1]).toEqual({
        content: 'Completed task',
        type: 'list',
        level: 0,
        metadata: {
          taskList: true,
          checked: true
        }
      });
      expect(blocks[2]).toEqual({
        content: 'Task with #tag',
        type: 'list',
        level: 0,
        metadata: {
          taskList: true,
          checked: false,
          logseqSyntax: {
            tags: ['tag']
          }
        }
      });
    });
  });

  describe('Tables', () => {
    it('should parse tables correctly', () => {
      const content = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toContain('| Header 1 | Header 2 | Header 3 |');
      expect(blocks[0].type).toBe('table');
      expect(blocks[0].metadata?.tableHeaders).toEqual(['Header 1', 'Header 2', 'Header 3']);
    });
  });

  describe('Other Content Types', () => {
    it('should parse blockquotes', () => {
      const content = `> This is a blockquote
> with multiple lines
> and [[page link]]`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].content).toContain('> This is a blockquote');
      expect(blocks[0].type).toBe('blockquote');
      expect(blocks[0].metadata?.logseqSyntax?.pageLinks).toEqual(['page link']);
    });

    it('should parse images', () => {
      const content = `![Alt text](https://example.com/image.png "Title")

![No title](https://example.com/image2.png)`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].content).toContain('![Alt text](https://example.com/image.png');
      expect(blocks[0].type).toBe('image');
      expect(blocks[0].metadata?.url).toBe('https://example.com/image.png');
      expect(blocks[0].metadata?.alt).toBe('Alt text');
      expect(blocks[1].content).toContain('![No title](https://example.com/image2.png)');
      expect(blocks[1].type).toBe('image');
      expect(blocks[1].metadata?.url).toBe('https://example.com/image2.png');
      expect(blocks[1].metadata?.alt).toBe('No title');
    });

    it('should parse thematic breaks', () => {
      const content = `Content before

---

Content after`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks).toHaveLength(3);
      expect(blocks[1]).toEqual({
        content: '---',
        type: 'thematic_break',
        level: 0
      });
    });
  });

  describe('Logseq-Specific Syntax', () => {
    it('should extract page links', () => {
      const content = `This paragraph has [[Page Link]] and [[Another Page]].`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks[0].metadata?.logseqSyntax?.pageLinks).toEqual(['Page Link', 'Another Page']);
    });

    it('should extract block references', () => {
      const content = `Reference to ((block-uuid-123)) and ((another-block)).`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks[0].metadata?.logseqSyntax?.blockRefs).toEqual(['block-uuid-123', 'another-block']);
    });

    it('should extract tags', () => {
      const content = `Content with #tag1 and #tag-2 and #another_tag.`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks[0].metadata?.logseqSyntax?.tags).toEqual(['tag1', 'tag-2', 'another_tag']);
    });

    it('should extract properties', () => {
      const content = `title:: My Page Title
author:: John Doe
status:: completed

Some content here.`;
      
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks[0].metadata?.logseqSyntax?.properties).toEqual({
        title: 'My Page Title',
        author: 'John Doe',
        status: 'completed'
      });
    });
  });

  describe('Content Validation and Sanitization', () => {
    it('should sanitize dangerous HTML by default', () => {
      const content = `<script>alert('xss')</script>
<iframe src="evil.com"></iframe>
<a href="javascript:alert('xss')">Click me</a>
<div onclick="evil()">Div</div>`;
      
      const validated = validateMarkdownContent(content);
      
      expect(validated).not.toContain('<script>');
      expect(validated).not.toContain('<iframe>');
      expect(validated).not.toContain('javascript:');
      expect(validated).not.toContain('onclick');
    });

    it('should normalize line endings', () => {
      const content = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      
      const validated = validateMarkdownContent(content);
      
      expect(validated).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    });

    it('should remove excessive blank lines', () => {
      const content = 'Line 1\n\n\n\n\nLine 2';
      
      const validated = validateMarkdownContent(content);
      
      expect(validated).toBe('Line 1\n\nLine 2');
    });
  });

  describe('Content Analysis', () => {
    it('should analyze Logseq content correctly', () => {
      const content = `# Page with [[Links]] and #tags

Some content with ((block-ref)).

title:: My Title
status:: done`;
      
      const analysis = analyzeLogseqContent(content);
      
      expect(analysis).toEqual({
        hasPageLinks: true,
        hasBlockRefs: true,
        hasTags: true,
        hasProperties: true,
        pageLinks: ['Links'],
        blockRefs: ['block-ref'],
        tags: ['tags'],
        properties: {
          title: 'My Title',
          status: 'done'
        },
        isLogseqFormatted: true
      });
    });

    it('should identify non-Logseq content', () => {
      const content = `# Regular Markdown

Just some regular markdown content without Logseq syntax.`;
      
      const analysis = analyzeLogseqContent(content);
      
      expect(analysis.isLogseqFormatted).toBe(false);
      expect(analysis.hasPageLinks).toBe(false);
      expect(analysis.hasBlockRefs).toBe(false);
      expect(analysis.hasTags).toBe(false);
      expect(analysis.hasProperties).toBe(false);
    });
  });

  describe('Fallback Parsing', () => {
    it('should handle malformed markdown gracefully', () => {
      const content = `# Heading
      
Paragraph with *unclosed emphasis

\`\`\`broken
code block without closing
more text

| broken | table
row`;
      
      // Should not throw and return reasonable blocks
      const blocks = parseMarkdownToBlocks(content);
      
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0].type).toBe('heading');
    });
  });

  describe('Utility Functions', () => {
    it('should convert blocks back to markdown', () => {
      const blocks: ParsedBlock[] = [
        {
          content: '# Heading',
          type: 'heading',
          level: 1
        },
        {
          content: 'Paragraph content',
          type: 'paragraph',
          level: 0
        },
        {
          content: 'List item',
          type: 'list',
          level: 1
        }
      ];
      
      const markdown = blocksToMarkdown(blocks);
      
      expect(markdown).toBe('# Heading\n\nParagraph content\n\n  List item');
    });

    it('should parse with Logseq-focused configuration', () => {
      const content = `# Test [[Page]]
      
- Item with #tag
- [ ] Task item`;
      
      const blocks = parseLogseqMarkdown(content);
      
      expect(blocks).toHaveLength(3);
      expect(blocks[0].metadata?.logseqSyntax?.pageLinks).toEqual(['Page']);
      expect(blocks[1].metadata?.logseqSyntax?.tags).toEqual(['tag']);
      expect(blocks[2].metadata?.taskList).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should respect HTML sanitization settings', () => {
      const content = '<div>HTML content</div>';
      const config: ParseConfig = {
        allowHtml: true,
        sanitizeHtml: false
      };
      
      const validated = validateMarkdownContent(content, config);
      
      expect(validated).toContain('<div>');
    });

    it('should respect nesting level limits', () => {
      const content = `- Level 1
  - Level 2
    - Level 3
      - Level 4
        - Level 5`;
      
      const config: ParseConfig = {
        maxNestingLevel: 3
      };
      
      const blocks = parseMarkdownToBlocks(content, config);
      
      // Should limit deep nesting
      const maxLevel = Math.max(...blocks.map(b => b.level));
      expect(maxLevel).toBeLessThanOrEqual(3);
    });
  });
});