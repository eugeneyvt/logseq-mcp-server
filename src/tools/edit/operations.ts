/**
 * Edit Tool Operations Module
 * Central dispatcher for all edit operations with type routing
 */

import { logger } from '../../utils/system/logger.js';
import type { PerformanceAwareLogseqClient } from "../../adapters/client.js";
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import { SecureValidationHelpers } from '../../utils/validation.js';
import type { EditParams } from '../../validation/schemas.js';
import { generateStateHash } from './utils.js';
import { parseMarkdownToLogseqBlocks } from '../../parsers/index.js';
import { insertBlockTree } from '../../entities/blocks/insert-tree.js';

// Import entity operation modules
import { editPage } from '../../entities/pages/operations.js';
import { editBlock } from '../../entities/blocks/operations.js';
import { editTemplate } from '../../entities/templates/index.js';
import { editTask } from '../../entities/tasks/operations.js';

// Properties and Relations still use tool dispatchers (until they're moved to entities)
import { editProperties, editRelations } from './properties.js';

/**
 * Main operation executor with type routing and content sanitization
 */
export async function executeEdit(
  perfClient: PerformanceAwareLogseqClient,
  params: EditParams
): Promise<{ changes: unknown; data?: unknown }> {

  // Sanitize content and property keys before processing
  let sanitizedParams = params;
  
  // Sanitize content if provided
  if (params.content && typeof params.content === 'string') {
    const contentValidation = SecureValidationHelpers.validateAndSanitizeBlockContent(params.content, true);
    if (contentValidation.error) {
      throw new Error(`Content sanitization failed: ${contentValidation.error.message}`);
    }
    if (contentValidation.sanitizedContent) {
      sanitizedParams = { ...params, content: contentValidation.sanitizedContent };
      logger.info({ 
        originalLength: params.content.length, 
        sanitizedLength: contentValidation.sanitizedContent.length 
      }, 'Content sanitized for edit operation');
    }
  }
  
  // Validate property key if provided
  if (params.propertyKey) {
    const propertyKeyError = SecureValidationHelpers.validatePropertyKey(params.propertyKey);
    if (propertyKeyError) {
      throw new Error(`Property key validation failed: ${propertyKeyError.message}`);
    }
    logger.debug({ propertyKey: params.propertyKey }, 'Property key validated for edit operation');
  }

  const targets = Array.isArray(sanitizedParams.target) ? sanitizedParams.target : [sanitizedParams.target];
  const beforeHash = await generateStateHash(perfClient.underlyingClient, sanitizedParams);

  const results = [];
  let operationsPerformed = 0;
  const maxOps = params.control?.maxOps ?? 100;
  
  // Process each target
  for (const target of targets) {
    if (operationsPerformed >= maxOps) {
      const limitErr = createStructuredError(ErrorCode.LIMIT_EXCEEDED, {
        reason: `Operation limit exceeded (${operationsPerformed} >= ${maxOps})`,
        suggestion: 'Reduce the number of targets or increase control.maxOps'
      });
      results.push({ target, success: false, error: limitErr.message });
      break;
    }
    const singleParams: EditParams = { ...sanitizedParams, target };
    
    try {
      let result: unknown;
      
      // Route to appropriate handler with performance monitoring
      switch (sanitizedParams.type) {
        case 'page':
          if (
            singleParams.operation === 'create' &&
            singleParams.content &&
            (singleParams.control?.parseMarkdown ?? true)
          ) {
            // Ensure page exists first
            await perfClient.underlyingClient.callApi('logseq.Editor.createPage', [target]);
            // Remove initial empty block if present
            try {
              const existing = await perfClient.underlyingClient.getPageBlocksTree(target);
              if (Array.isArray(existing) && existing.length > 0) {
                const first = existing[0] as Record<string, unknown>;
                const firstUuid = typeof first.uuid === 'string' ? first.uuid : undefined;
                const firstContent = typeof first.content === 'string' ? first.content : '';
                if (firstUuid && (!firstContent || firstContent.trim().length === 0)) {
                  await perfClient.underlyingClient.callApi('logseq.Editor.removeBlock', [firstUuid]);
                }
              }
            } catch {
              // best-effort cleanup
            }
            
            // Build recursive block tree and insert
            const { markdownToBlocks } = await import('../../parsers/index.js');
            const { insertBlockTree } = await import('../../entities/blocks/insert-tree.js');
            const roots = markdownToBlocks(String(singleParams.content));
            await insertBlockTree(perfClient.underlyingClient, target, { parent_block_id: target }, roots);
            
            result = { page_name: target, created: true };
          } else {
            result = await editPage(perfClient.underlyingClient, singleParams);
          }
          // Invalidate page cache after modification
          perfClient.invalidateCache('page', target);
          break;
          
        case 'block':
          // For block create with parseMarkdown, insert tree honoring position
          if (
            singleParams.operation === 'create' &&
            singleParams.content &&
            (singleParams.control?.parseMarkdown ?? true)
          ) {
            // Use the new Logseq-compatible parser directly
            const logseqBlocks = parseMarkdownToLogseqBlocks(String(singleParams.content));
            // Convert LogseqBlock format to BlockNode format for insertBlockTree
            const roots = logseqBlocks.map(block => ({
              text: block.content,
              children: block.children ? block.children.map(child => ({
                text: child.content,
                children: child.children ? child.children.map(grandchild => ({
                  text: grandchild.content,
                  children: []
                })) : []
              })) : []
            }));
            await insertBlockTree(
              perfClient.underlyingClient,
              target,
              {
                parent_block_id: singleParams.position?.parent_block_id,
                after_block_id: singleParams.position?.after_block_id,
                before_block_id: singleParams.position?.before_block_id,
              },
              roots
            );
            result = { target, created_blocks: roots.length };
          } else {
            result = await editBlock(perfClient.underlyingClient, singleParams);
          }
          // Invalidate block cache after modification
          perfClient.invalidateCache('block', target);
          break;
          
        case 'template':
          result = await editTemplate(perfClient.underlyingClient, singleParams);
          // Invalidate page cache since templates are stored as pages
          perfClient.invalidateCache('page', target);
          break;
          
        case 'properties':
          result = await editProperties(perfClient.underlyingClient, singleParams);
          // Invalidate appropriate cache based on target type
          if (target.length >= 32 && target.includes('-')) {
            perfClient.invalidateCache('block', target);
          } else {
            perfClient.invalidateCache('page', target);
          }
          break;
          
        case 'relations':
          result = await editRelations(perfClient.underlyingClient, singleParams);
          // Invalidate appropriate cache based on target type
          if (target.length >= 32 && target.includes('-')) {
            perfClient.invalidateCache('block', target);
          } else {
            perfClient.invalidateCache('page', target);
          }
          break;
          
        case 'tasks':
          result = await editTask(perfClient.underlyingClient, singleParams);
          // Invalidate appropriate cache based on target type
          if (target.length >= 32 && target.includes('-')) {
            perfClient.invalidateCache('block', target);
          } else {
            perfClient.invalidateCache('page', target);
          }
          break;
          
        default: {
          const error = createStructuredError(ErrorCode.INVALID_ARGUMENT, {
            type: 'content type',
            target: params.type,
            reason: 'Unsupported content type for edit operations',
            suggestion: 'Use one of: page, block, template, properties, relations, tasks'
          });
          throw new Error(error.message);
        }
      }
      
      results.push({ target, success: true, data: result });
      operationsPerformed++;
      
      logger.debug({
        type: sanitizedParams.type,
        operation: sanitizedParams.operation,
        target,
        success: true
      }, 'Edit operation completed successfully');
      
    } catch (error) {
      logger.error({
        type: sanitizedParams.type,
        operation: sanitizedParams.operation,
        target,
        error: error instanceof Error ? error.message : String(error)
      }, 'Edit operation failed');
      
      results.push({ 
        target, 
        success: false, 
        error: String(error) 
      });
    }
  }
  
  // Generate final state hash for change detection
  const afterHash = await generateStateHash(perfClient.underlyingClient, sanitizedParams);
  
  return {
    changes: {
      before_hash: beforeHash,
      after_hash: afterHash,
      operations_performed: operationsPerformed,
      content_modified: beforeHash !== afterHash,
      targets_processed: targets.length,
      successful_operations: results.filter(r => r.success).length,
      failed_operations: results.filter(r => !r.success).length
    },
    data: Array.isArray(params.target) ? results : results[0]?.data
  };
}
