/**
 * Delete Tool Schema
 * Input schema definition for the delete tool
 */

export const deleteToolSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['page', 'block', 'template', 'properties', 'relations', 'tasks'],
      description: 'Type of content to delete'
    },
    target: {
      description: 'Target identifier(s) to delete',
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } }
      ]
    },
    confirmDestroy: {
      type: 'boolean',
      description: 'REQUIRED: Explicit confirmation for deletion (safety measure)'
    },
    simulate: {
      type: 'boolean',
      default: false,
      description: 'Show what would be deleted without doing it'
    },
    cascade: {
      type: 'boolean',
      default: false,
      description: 'Delete dependent content automatically'
    },
    softDelete: {
      type: 'boolean',
      default: false,
      description: 'Move to trash instead of permanent deletion'
    },
    control: {
      type: 'object',
      properties: {
        maxOps: { type: 'number', default: 100, description: 'Maximum operations limit' },
        idempotencyKey: { type: 'string', description: 'Key for safe retries' }
      }
    }
  },
  required: ['type', 'target', 'confirmDestroy']
} as const;