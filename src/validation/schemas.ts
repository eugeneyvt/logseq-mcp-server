/**
 * Legacy Schemas (Backward Compatibility)
 * Re-exports from new structured validation modules
 * 
 * @deprecated Import directly from validation/tools/ or validation/entities/ instead
 */

// Tool schemas
export {
  SearchParamsSchema,
  SearchResponseSchema,
  type SearchParams,
  type SearchResponse
} from './tools/search.zod.js';

export {
  GetParamsSchema,
  GetResponseSchema,
  type GetParams,
  type GetResponse
} from './tools/get.zod.js';

export {
  EditParamsSchema,
  EditResponseSchema,
  type EditParams,
  type EditResponse
} from './tools/edit.zod.js';

export {
  DeleteParamsSchema,
  DeleteResponseSchema,
  type DeleteParams,
  type DeleteResponse
} from './tools/delete.zod.js';

// Common entity schemas
export {
  ContentTypeSchema,
  type ContentType
} from './entities/common.zod.js';