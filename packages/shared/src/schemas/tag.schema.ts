import { z } from 'zod';

// Tag colors - predefined palette
export const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
] as const;

// Create tag schema
export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(30, 'Tag name must be 30 characters or less')
    .trim(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#6366f1'),
  description: z.string().max(200).optional(),
});

// Update tag schema
export const updateTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(30, 'Tag name must be 30 characters or less')
    .trim()
    .optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  description: z.string().max(200).nullable().optional(),
});

// Add tag to member schema
export const addMemberTagSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required'),
});

// Types
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type AddMemberTagInput = z.infer<typeof addMemberTagSchema>;
