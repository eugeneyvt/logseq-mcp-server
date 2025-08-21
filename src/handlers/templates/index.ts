// Export all template-related functionality
export { createTemplateHandlers } from '../template-handlers.js';
export {
  ApplyTemplateParamsSchema,
  type ApplyTemplateParams,
  type TemplateInfo,
  type TemplateListItem,
} from './template-types.js';
export {
  listAllTemplates,
  findTemplateByName,
  applyTemplateToPage,
} from './template-operations.js';
export { createNewTemplate } from './template-creation.js';
export {
  extractTemplatePlaceholders,
  extractTemplatePlaceholdersFromContent,
  substituteTemplateVariables,
  normalizeTemplatePlaceholders,
} from './template-utils.js';
