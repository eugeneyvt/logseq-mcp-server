/**
 * Search Tool Schema
 * Input schema definition for the search tool
 */

export const searchToolSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Free-text search query. Use quotes for exact phrases.'
    },
    target: {
      type: 'string',
      enum: ['blocks', 'pages', 'tasks', 'templates', 'both'],
      default: 'both',
      description: 'What to search: specific content types or both pages and blocks'
    },
    filter: {
      type: 'object',
      properties: {
        contains: { type: 'string', description: 'Content must contain this text' },
        exclude: { type: 'string', description: 'Content must not contain this text' },
        tags_all: { type: 'array', items: { type: 'string' }, description: 'Has all of these tags' },
        tags_any: { type: 'array', items: { type: 'string' }, description: 'Has any of these tags' },
        properties_all: { type: 'object', description: 'Must have all these properties', additionalProperties: true },
        properties_any: { type: 'object', description: 'Must have any of these properties', additionalProperties: true },
        createdAfter: { type: 'string', format: 'date-time', description: 'Created after this date (ISO 8601)' },
        createdBefore: { type: 'string', format: 'date-time', description: 'Created before this date' },
        updatedAfter: { type: 'string', format: 'date-time', description: 'Updated after this date' },
        updatedBefore: { type: 'string', format: 'date-time', description: 'Updated before this date' },
        todoState: { type: 'string', enum: ['TODO', 'DOING', 'DONE', 'WAITING', 'LATER', 'NOW', 'CANCELED'], description: 'Task state' },
        hasRefs: { type: 'boolean', description: 'Has any references' },
        lengthMin: { type: 'integer', minimum: 0, description: 'Minimum content length' },
        lengthMax: { type: 'integer', minimum: 1, description: 'Maximum content length' }
      }
    },
    scope: {
      type: 'object',
      properties: {
        page_titles: { type: 'array', items: { type: 'string' }, description: 'Search within specific pages' },
        tag: { type: 'string', description: 'Search pages with specific tag' },
        namespace: { type: 'string', description: 'Search within namespace (e.g., "projects/ai/")' },
        journal: { type: 'boolean', description: 'Search journal pages only' },
        parent_block_id: { type: 'string', description: 'Search within specific block tree' }
      }
    },
    sort: {
      type: 'string',
      enum: ['relevance', 'created', 'updated', 'title', 'page_title', 'deadline', 'scheduled', 'length'],
      default: 'relevance',
      description: 'Sort field'
    },
    order: {
      type: 'string',
      enum: ['asc', 'desc'],
      default: 'desc',
      description: 'Sort order'
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Maximum results to return'
    },
    cursor: {
      type: 'string',
      description: 'Pagination cursor for next page'
    }
  }
} as const;