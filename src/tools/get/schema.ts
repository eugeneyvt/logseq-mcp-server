/**
 * Get Tool Schema
 * Input schema definition for the get tool
 */

export const getToolSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['page', 'block', 'template', 'properties', 'relations', 'tasks', 'system', 'graph'],
      description: 'Type of content to retrieve'
    },
    target: {
      description: 'Identifier(s): page titles, block UUIDs, template names, etc.',
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } }
      ]
    },
    include: {
      type: 'object',
      properties: {
        content: { type: 'boolean', description: 'Include full content vs summary' },
        properties: { type: 'boolean', description: 'Include properties' },
        backlinks: { type: 'boolean', description: 'Include backlink information' },
        children: { type: 'boolean', description: 'Include child blocks' }
      }
    },
    format: {
      type: 'string',
      enum: ['tree', 'flat'],
      default: 'tree',
      description: 'Format for hierarchical content'
    },
    depth: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      default: 2,
      description: 'Relationship/hierarchy depth (1-5)'
    },
    preview_length: {
      type: 'integer',
      minimum: 100,
      maximum: 5000,
      default: 500,
      description: 'Text preview max characters'
    }
  },
  required: ['type', 'target']
} as const;