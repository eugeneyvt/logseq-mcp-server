/**
 * Task Entity Validation Schemas
 * Zod schemas for task-specific operations and data
 */

import { z } from 'zod';
import { BlockSchema } from './block.zod.js';

export const TaskStatusSchema = z.enum([
  'TODO', 
  'DOING', 
  'DONE', 
  'WAITING', 
  'LATER', 
  'NOW', 
  'CANCELED'
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = BlockSchema.extend({
  marker: TaskStatusSchema,
  priority: z.enum(['A', 'B', 'C']).optional(),
  scheduled: z.number().optional(),
  deadline: z.number().optional()
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskArraySchema = z.array(TaskSchema);
export type TaskArray = z.infer<typeof TaskArraySchema>;