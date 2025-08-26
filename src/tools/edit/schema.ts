/**
 * Edit Tool Schema
 * Input schema definition for the edit tool
 */

export const editToolSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['page', 'block', 'template', 'properties', 'relations', 'tasks'],
      description: 'Type of content to edit'
    },
    operation: {
      type: 'string',
      enum: ['create', 'update', 'append', 'prepend', 'move', 'remove'],
      description: 'Operation to perform'
    },
    target: {
      description: 'Target identifier(s). For pages: use page names or auto-resolved UUIDs. For blocks: use block UUIDs (required). For bulk operations: use array of identifiers.',
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } }
      ]
    },
    content: {
      description: 'Content for the operation. Not used for property operations - use propertyKey and propertyValue instead.'
    },
    position: {
      type: 'object',
      description: 'Position specification for block operations. Required for block creation and move operations.',
      properties: {
        parent_block_id: { type: 'string', description: 'Insert as child of this block UUID' },
        after_block_id: { type: 'string', description: 'Insert after this block UUID' },
        before_block_id: { type: 'string', description: 'Insert before this block UUID' },
        index: { type: 'integer', minimum: 0, description: 'Position index within parent (0-based)' }
      }
    },
    propertyKey: {
      type: 'string',
      description: 'Property key for property operations. Required for type="properties" operations.'
    },
    propertyValue: {
      description: 'Property value for property operations. Required for create/update property operations. Can be string, number, boolean, or array.'
    },
    taskState: {
      type: 'string',
      enum: ['TODO', 'DOING', 'DONE', 'WAITING', 'LATER', 'NOW', 'CANCELED'],
      description: 'Task state for task operations'
    },
    templateName: {
      type: 'string',
      description: 'Template name for template operations'
    },
    variables: {
      type: 'object',
      additionalProperties: true,
      description: 'Variables for template substitution'
    },
    linkContext: {
      type: 'string',
      description: 'Context text for relation operations'
    },
    dryRun: {
      type: 'boolean',
      default: false,
      description: 'Validate without executing'
    },
    idempotencyKey: {
      type: 'string',
      description: 'Key for safe retries'
    },
    confirmDestroy: {
      type: 'boolean',
      description: 'Required true for remove operations to confirm deletion'
    },
    control: {
      type: 'object',
      properties: {
        strict: { type: 'boolean', default: true },
        autofixFormat: { type: 'boolean', default: true },
        parseMarkdown: { type: 'boolean', default: false },
        renderMode: { type: 'string', enum: ['readable', 'hierarchical', 'singleBlock'], default: 'readable' },
        maxOps: { type: 'number', default: 100 }
      }
    }
  },
  required: ['type', 'operation', 'target']
} as const;
