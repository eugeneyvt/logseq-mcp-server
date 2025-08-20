import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LogseqClient } from '../../logseq-client.js';
import { PageNameSchema } from '../../schemas/logseq.js';
import { BacklinksToolArgsSchema } from '../../types/tool-arguments.js';

interface DataScriptBlock {
  id: string;
  content: string;
  page?: { name: string };
}

export function createReferenceTools(client: LogseqClient) {
  const tools: Tool[] = [
    {
      name: 'logseq_get_backlinks',
      description: 'Find all pages and blocks that reference a specific page',
      inputSchema: {
        type: 'object',
        properties: {
          pageName: {
            type: 'string',
            description: 'The name of the page to find backlinks for',
          },
        },
        required: ['pageName'],
      },
    },
  ];

  const handlers = {
    logseq_get_backlinks: async (args: unknown) => {
      const parsed = BacklinksToolArgsSchema.parse(args);
      const pageName = PageNameSchema.parse(parsed.pageName);

      try {
        // Use DataScript to find blocks that reference this page
        const query = `[:find (pull ?b [*])
                        :where 
                        [?page :block/name "${pageName}"]
                        [?b :block/refs ?page]]`;

        const results = await client.datascriptQuery(query);

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No backlinks found for page "${pageName}".`,
              },
            ],
          };
        }

        const formattedResults = results
          .map((result: unknown) => {
            const block = (result as unknown[])[0] as DataScriptBlock;
            return (
              `- **Page**: ${block.page?.name || 'Unknown'}\n` +
              `  **Block**: ${block.content}\n` +
              `  **ID**: ${block.id}\n`
            );
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Backlinks for "${pageName}" (${results.length} references):\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to get backlinks for "${pageName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };

  return { tools, handlers };
}