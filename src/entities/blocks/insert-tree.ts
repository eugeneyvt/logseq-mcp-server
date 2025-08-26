import { logger } from '../../utils/system/logger.js';
import type { LogseqClient } from '../../logseq-client.js';
import type { BlockNode } from '../../parsers/index.js';

export interface InsertPosition {
  parent_block_id?: string;
  after_block_id?: string;
  before_block_id?: string;
}

async function insertSingle(
  client: LogseqClient,
  anchor: string,
  text: string,
  opts: { sibling: boolean; before?: boolean }
): Promise<string | undefined> {
  const created = await client.callApi('logseq.Editor.insertBlock', [anchor, text, opts]);
  if (!created) {
    return undefined;
  }
  if (typeof created === 'string') {
    return created;
  }
  if (typeof created === 'object' && 'uuid' in created) {
    return String((created as { uuid: unknown }).uuid);
  }
  // Some clients return an array or nested object; attempt common patterns
  const createdObj = created as Record<string, unknown>;
  const nestedBlock = (createdObj.block as Record<string, unknown> | undefined);
  if (nestedBlock && typeof nestedBlock.uuid === 'string') {
    return nestedBlock.uuid;
  }
  const arr = created as unknown as Array<Record<string, unknown>>;
  if (Array.isArray(arr) && arr.length > 0 && typeof arr[0]?.uuid === 'string') {
    return String(arr[0].uuid);
  }
  return undefined;
}

export async function insertBlockTree(
  client: LogseqClient,
  target: string,
  position: InsertPosition | undefined,
  roots: BlockNode[]
): Promise<string[]> {
  const createdRoots: string[] = [];

  // Determine initial insertion anchor and options
  let anchor = target;
  let baseOpts: { sibling: boolean; before?: boolean } = { sibling: false };
  if (position?.after_block_id) {
    anchor = position.after_block_id;
    baseOpts = { sibling: true };
  } else if (position?.before_block_id) {
    anchor = position.before_block_id;
    baseOpts = { sibling: true, before: true };
  } else if (position?.parent_block_id) {
    anchor = position.parent_block_id;
    baseOpts = { sibling: false };
  }

  let lastCreatedRoot: string | undefined;

  for (let i = 0; i < roots.length; i++) {
    const block = roots[i];
    let currentAnchor = anchor;
    let opts = baseOpts;
    // After the first root, chain as sibling after the previously created block
    if (i > 0 && lastCreatedRoot) {
      currentAnchor = lastCreatedRoot;
      opts = { sibling: true, before: false };
    }

    const createdUuid = await insertSingle(client, currentAnchor, block.text, opts);
    if (!createdUuid) {
      logger.warn({ text: block.text.slice(0, 60) }, 'Failed to obtain created block uuid');
      continue;
    }
    createdRoots.push(createdUuid);
    lastCreatedRoot = createdUuid;

    // Insert all children under this new block, preserving order
    if (block.children && block.children.length > 0) {
      await insertBlockTree(client, createdUuid, { parent_block_id: createdUuid }, block.children);
    }
  }

  return createdRoots;
}
