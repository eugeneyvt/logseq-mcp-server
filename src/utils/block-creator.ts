import type { LogseqClient } from '../logseq-client.js';
import type { ParsedBlock } from './markdown-parser.js';
import { logger } from './logger.js';

/**
 * Create Logseq blocks from parsed markdown blocks with proper hierarchy
 */
export async function createBlocksFromParsed(
  client: LogseqClient,
  pageName: string,
  parsedBlocks: ParsedBlock[]
): Promise<Array<{ success: boolean; block?: unknown; type?: string; level?: number; error?: string; content?: string }>> {
  const createdBlocks = [];
  let currentHeadingId: string | null = null;
  let currentBoldParentId: string | null = null; // Track bold paragraphs as grouping elements
  
  for (const parsedBlock of parsedBlocks) {
    try {
      const { content, type, level } = parsedBlock;
      if (!content.trim()) {
        continue; // Skip empty blocks
      }
      
      let block;
      
      if (type === 'heading') {
        // ALL headings are created at page level (no nesting between headings)
        block = await client.insertBlock(pageName, content, {
          isPageBlock: true
        });
        currentHeadingId = block.uuid || String(block.id);
        currentBoldParentId = null; // Reset bold parent when hitting new heading
        
        createdBlocks.push({ success: true, block, type: 'heading', level });
        
      } else if (type === 'list') {
        // List items are automatically cleaned by the AST parser (no '-' prefix)
        // Determine parent: bold parent or current heading
        let parentId = currentHeadingId;
        if (currentBoldParentId) {
          // Nest under the most recent bold paragraph (like **Repository Structure**)
          parentId = currentBoldParentId;
        }
        
        if (parentId && content.trim()) {
          block = await client.insertBlock(parentId, content.trim(), {
            parent: true
          });
        } else {
          // Fallback to page level if no parent
          block = await client.insertBlock(pageName, content.trim(), {
            isPageBlock: true
          });
        }
        
        createdBlocks.push({ success: true, block, type: 'list-item' });
        
      } else if (type === 'code') {
        // Code blocks - treat similar to paragraphs but maintain as separate blocks
        if (currentHeadingId) {
          // Content under a heading - nest it
          block = await client.insertBlock(currentHeadingId, content, {
            parent: true
          });
          createdBlocks.push({ success: true, block, type: 'code-nested' });
        } else {
          // No current heading - create at page level
          block = await client.insertBlock(pageName, content, {
            isPageBlock: true
          });
          createdBlocks.push({ success: true, block, type: 'code' });
        }
        
        // Code blocks reset the bold parent
        currentBoldParentId = null;
        
      } else {
        // Regular paragraph content
        // Check if this is a bold paragraph that should act as a grouping element
        const isBoldParagraph = content.match(/^\*\*[^*]+\*\*$/);
        
        if (isBoldParagraph && currentHeadingId) {
          // Bold paragraph - create under current heading and use as parent for subsequent lists
          block = await client.insertBlock(currentHeadingId, content, {
            parent: true
          });
          currentBoldParentId = block.uuid || String(block.id);
          createdBlocks.push({ success: true, block, type: 'bold-paragraph' });
          
        } else {
          // Regular paragraph content
          if (currentHeadingId) {
            // Content under a heading - nest it
            block = await client.insertBlock(currentHeadingId, content, {
              parent: true
            });
            createdBlocks.push({ success: true, block, type: 'paragraph-nested' });
          } else {
            // No current heading - create at page level
            block = await client.insertBlock(pageName, content, {
              isPageBlock: true
            });
            createdBlocks.push({ success: true, block, type: 'paragraph' });
          }
          
          // Regular paragraphs reset the bold parent
          currentBoldParentId = null;
        }
      }
    } catch (error) {
      logger.warn({ 
        content: parsedBlock.content.substring(0, 100), 
        type: parsedBlock.type,
        level: parsedBlock.level,
        error 
      }, 'Failed to create block in set_page_content');
      createdBlocks.push({ success: false, error: String(error), content: parsedBlock.content.substring(0, 50) });
    }
  }
  
  return createdBlocks;
}