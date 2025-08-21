import type { LogseqClient } from '../../logseq-client.js';
import { ErrorCode } from '../../schemas/logseq.js';
import { createResponse, createErrorResponse } from '../common.js';
import type { ManageRelationsParams } from './relation-types.js';
import { buildLinkContent, buildBacklinkContent, removeLinkReferences } from './relation-utils.js';

/**
 * Create a link between two pages
 */
export async function createPageLink(
  client: LogseqClient,
  params: ManageRelationsParams
): Promise<unknown> {
  if (!params.targetPage) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'targetPage is required for create-link operation'
    );
  }

  try {
    // Ensure both pages exist
    await client.callApi('logseq.Editor.createPage', [params.sourcePage]);
    await client.callApi('logseq.Editor.createPage', [params.targetPage]);

    // Create link content
    const linkContent = buildLinkContent(params.targetPage, params.linkText, params.context);

    // Add link to source page
    await client.callApi('logseq.Editor.insertBlock', [
      params.sourcePage,
      linkContent,
      { sibling: false },
    ]);

    // Create bi-directional reference (optional backlink)
    const backlinkContent = buildBacklinkContent(params.sourcePage, params.linkText);
    await client.callApi('logseq.Editor.insertBlock', [
      params.targetPage,
      backlinkContent,
      { sibling: false },
    ]);

    return createResponse({
      success: true,
      operation: 'create-link',
      sourcePage: params.sourcePage,
      targetPage: params.targetPage,
      linkContent,
      backlinkContent,
      message: 'Bi-directional link created successfully',
    });
  } catch (error) {
    return createErrorResponse(
      ErrorCode.INTERNAL,
      `Failed to create link: ${error}`,
      'Check that both pages exist and are accessible'
    );
  }
}

/**
 * Remove links between two pages
 */
export async function removePageLink(
  client: LogseqClient,
  params: ManageRelationsParams
): Promise<unknown> {
  if (!params.targetPage) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'targetPage is required for remove-link operation'
    );
  }

  try {
    let removedCount = 0;

    // Remove links from source page
    const sourceBlocks = await client.getPageBlocksTree(params.sourcePage);
    if (sourceBlocks) {
      removedCount += await removeLinkReferences(client, sourceBlocks, params.targetPage);
    }

    // Remove backlinks from target page
    const targetBlocks = await client.getPageBlocksTree(params.targetPage);
    if (targetBlocks) {
      removedCount += await removeLinkReferences(client, targetBlocks, params.sourcePage);
    }

    return createResponse({
      success: true,
      operation: 'remove-link',
      sourcePage: params.sourcePage,
      targetPage: params.targetPage,
      removedReferences: removedCount,
      message: `Removed ${removedCount} references between the pages`,
    });
  } catch (error) {
    return createErrorResponse(ErrorCode.INTERNAL, `Failed to remove links: ${error}`);
  }
}
