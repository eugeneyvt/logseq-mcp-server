/**
 * Properties Entity Operations
 * Handles property creation, update, and removal for pages and blocks
 */

import { logger } from '../../utils/system/logger.js';
import { ErrorCode, createStructuredError } from '../../utils/system/errors.js';
import type { PerformanceAwareLogseqClient } from '../../adapters/client.js';
import type { EditParams } from '../../validation/schemas.js';

export async function setPropertyForTarget(
  perfClient: PerformanceAwareLogseqClient,
  target: string,
  params: EditParams
): Promise<unknown> {
  if (params.dryRun) {
    return { action: 'set_property', target, key: params.propertyKey, value: params.propertyValue, dry_run: true };
  }
  if (!params.propertyKey || params.propertyValue === undefined) {
    return { error: createStructuredError(ErrorCode.INVALID_ARGUMENT, { field: 'propertyKey/propertyValue', reason: 'propertyKey and propertyValue are required for property operations', suggestion: 'Provide both propertyKey and propertyValue' }) };
  }
  try {
    let blockUuid = target;
    if (!(target.length >= 32 && target.includes('-'))) {
      const page = await perfClient.underlyingClient.getPage(target);
      if (!page || typeof page !== 'object') {
        return { error: createStructuredError(ErrorCode.NOT_FOUND, { type: 'page', target, suggestion: 'Create the page first or specify an existing page/block UUID' }) };
      }
      const blocks = await perfClient.underlyingClient.getPageBlocksTree(target);
      if (!Array.isArray(blocks) || blocks.length === 0) {
        return { error: createStructuredError(ErrorCode.GRAPH_CONSISTENCY, { type: 'page', target, reason: 'Page has no root blocks to attach properties', suggestion: 'Open the page in Logseq to initialize it, then retry' }) };
      }
      const first = blocks[0] as Record<string, unknown>;
      blockUuid = typeof first.uuid === 'string' ? first.uuid : target;
    }
    // Normalize well-known properties
    let value: unknown = params.propertyValue;
    if (params.propertyKey.toLowerCase() === 'tags') {
      if (typeof value === 'string') {
        value = value
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (Array.isArray(value)) {
        value = value
          .map((v) => String(v).trim())
          .filter((s) => s.length > 0);
      }
    }

    await perfClient.underlyingClient.callApi('logseq.Editor.upsertBlockProperty', [blockUuid, params.propertyKey, value]);
    return { successful: true, target, property_key: params.propertyKey, property_value: value, target_type: (target.length >= 32 && target.includes('-')) ? 'block' : 'page' };
  } catch (error) {
    logger.error({ error, target, key: params.propertyKey }, 'Failed to set property');
    return { error: createStructuredError(ErrorCode.INTERNAL, { error: String(error), operation: 'set_property' }) };
  }
}

export async function removePropertyForTarget(
  perfClient: PerformanceAwareLogseqClient,
  target: string,
  params: EditParams
): Promise<unknown> {
  if (params.dryRun) {
    return { action: 'remove_property', target, key: params.propertyKey, dry_run: true };
  }
  if (!params.propertyKey) {
    return { error: createStructuredError(ErrorCode.INVALID_ARGUMENT, { field: 'propertyKey', reason: 'propertyKey is required for property removal operations', suggestion: 'Provide propertyKey parameter' }) };
  }
  try {
    let blockUuid = target;
    if (!(target.length >= 32 && target.includes('-'))) {
      const page = await perfClient.underlyingClient.getPage(target);
      if (!page || typeof page !== 'object') {
        return { error: createStructuredError(ErrorCode.NOT_FOUND, { type: 'page', target, suggestion: 'Specify an existing page or block UUID' }) };
      }
      const blocks = await perfClient.underlyingClient.getPageBlocksTree(target);
      if (!Array.isArray(blocks) || blocks.length === 0) {
        return { error: createStructuredError(ErrorCode.GRAPH_CONSISTENCY, { type: 'page', target, reason: 'Page has no root blocks to remove properties from', suggestion: 'Open the page in Logseq to initialize it, then retry' }) };
      }
      const first = blocks[0] as Record<string, unknown>;
      blockUuid = typeof first.uuid === 'string' ? first.uuid : target;
    }
    await perfClient.underlyingClient.callApi('logseq.Editor.removeBlockProperty', [blockUuid, params.propertyKey]);
    return { successful: true, target, property_key: params.propertyKey, removed: true, target_type: (target.length >= 32 && target.includes('-')) ? 'block' : 'page' };
  } catch (error) {
    logger.error({ error, target, key: params.propertyKey }, 'Failed to remove property');
    return { error: createStructuredError(ErrorCode.INTERNAL, { error: String(error), operation: 'remove_property' }) };
  }
}

export async function removeProperty(
  perfClient: PerformanceAwareLogseqClient,
  target: string,
  key: string
): Promise<boolean> {
  const res = await removePropertyForTarget(perfClient, target, { target, type: 'properties', operation: 'remove', propertyKey: key } as unknown as EditParams);
  if (res && typeof res === 'object' && 'error' in res) {
    throw new Error((res as { error: { message?: string } }).error?.message || 'Failed to remove property');
  }
  return true;
}

export async function getAllProperties(
  perfClient: PerformanceAwareLogseqClient,
  target: string,
  entityType?: 'page' | 'block'
): Promise<{ entityId: string; properties: Array<{ key: string; value: unknown }>; lastModified?: number }> {
  let blockUuid = target;
  const type: 'page' | 'block' = entityType || ((target.length >= 32 && target.includes('-')) ? 'block' : 'page');
  if (type === 'page') {
    const page = await perfClient.underlyingClient.getPage(target);
    if (!page || typeof page !== 'object') {
      throw new Error(`Page not found: ${target}`);
    }
    const blocks = await perfClient.underlyingClient.getPageBlocksTree(target);
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return { entityId: target, properties: [], lastModified: undefined };
    }
    const first = blocks[0] as Record<string, unknown>;
    blockUuid = typeof first.uuid === 'string' ? first.uuid : target;
  }
  const props = await perfClient.underlyingClient.callApi('logseq.Editor.getBlockProperties', [blockUuid]) as Record<string, unknown> | undefined;
  const properties: Array<{ key: string; value: unknown }> = [];
  if (props && typeof props === 'object') {
    for (const [k, v] of Object.entries(props)) {
      properties.push({ key: k, value: v });
    }
  }
  return { entityId: type === 'page' ? target : blockUuid, properties, lastModified: Date.now() };
}
