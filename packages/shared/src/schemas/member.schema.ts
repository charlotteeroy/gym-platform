import { z } from 'zod';
import { emailSchema } from './auth.schema';

export const memberStatusSchema = z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']);

export const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  relation: z.string().min(1, 'Relation is required').max(50),
});

export const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50).trim(),
  lastName: z.string().min(1, 'Last name is required').max(50).trim(),
  email: emailSchema,
  phone: z.string().max(20).optional(),
  dateOfBirth: z.coerce.date().optional(),
  emergencyContact: emergencyContactSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export const memberFilterSchema = z.object({
  status: memberStatusSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'joinedAt', 'status']).default('joinedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type MemberStatus = z.infer<typeof memberStatusSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberFilterInput = z.infer<typeof memberFilterSchema>;
