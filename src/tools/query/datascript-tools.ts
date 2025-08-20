import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import { DataScriptQuerySchema } from '../../schemas/logseq.js';
import { DataScriptToolArgsSchema } from '../../types/tool-arguments.js';

export function createDataScriptTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_datascript_query',
      description: 'Execute a DataScript query on the Logseq graph database',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The DataScript query in EDN format',
          },
        },
        required: ['query'],
      },
    },
  ];

  const handlers = {
    logseq_datascript_query: async (args: unknown) => {
      const parsed = DataScriptToolArgsSchema.parse(args);
      const query = DataScriptQuerySchema.parse(parsed.query);

      try {
        const results = await client.datascriptQuery(query);

        return {
          content: [
            {
              type: 'text' as const,
              text: `DataScript query results (${results.length} items):\n\n${JSON.stringify(results, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text:
                `DataScript query failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
                `Query: ${query}`,
            },
          ],
        };
      }
    },
  };

  return { tools, handlers };
}