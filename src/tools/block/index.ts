import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import { createBlockRetrievalTools } from './retrieval-tools.js';
import { createBlockCreationTools } from './creation-tools.js';
import { createBlockModificationTools } from './modification-tools.js';
import { createBlockPropertyTools } from './property-tools.js';

export function createBlockTools(client: LogseqClient) {
  const retrievalTools = createBlockRetrievalTools(client);
  const creationTools = createBlockCreationTools(client);
  const modificationTools = createBlockModificationTools(client);
  const propertyTools = createBlockPropertyTools(client);

  const tools: Tool[] = [
    ...retrievalTools.tools,
    ...creationTools.tools,
    ...modificationTools.tools,
    ...propertyTools.tools,
  ];

  const handlers = {
    ...retrievalTools.handlers,
    ...creationTools.handlers,
    ...modificationTools.handlers,
    ...propertyTools.handlers,
  };

  return { tools, handlers };
}

// Re-export individual tool creators for flexibility
export {
  createBlockRetrievalTools,
  createBlockCreationTools,
  createBlockModificationTools,
  createBlockPropertyTools,
};