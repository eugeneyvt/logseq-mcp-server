import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import { createSearchTools } from './search-tools.js';
import { createDataScriptTools } from './datascript-tools.js';
import { createReferenceTools } from './reference-tools.js';
import { createContextTools } from './context-tools.js';

export function createQueryTools(client: LogseqClient) {
  const searchTools = createSearchTools(client);
  const dataScriptTools = createDataScriptTools(client);
  const referenceTools = createReferenceTools(client);
  const contextTools = createContextTools(client);

  const tools: Tool[] = [
    ...searchTools.tools,
    ...dataScriptTools.tools,
    ...referenceTools.tools,
    ...contextTools.tools,
  ];

  const handlers = {
    ...searchTools.handlers,
    ...dataScriptTools.handlers,
    ...referenceTools.handlers,
    ...contextTools.handlers,
  };

  return { tools, handlers };
}

// Re-export individual tool creators for flexibility
export { createSearchTools, createDataScriptTools, createReferenceTools, createContextTools };