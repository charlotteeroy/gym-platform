import { z } from 'zod';
import { emailSchema, passwordSchema } from './auth.schema';

export const staffRoleSchema = z.enum(['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'FRONT_DESK']);

export const createStaffSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50).trim(),
  lastName: z.string().min(1, 'Last name is required').max(50).trim(),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().max(20).optional(),
  role: staffRoleSchema,
  hourlyRate: z.coerce.number().min(0).optional(),
});

export const updateStaffSchema = createStaffSchema.omit({ password: true }).partial();

export const inviteStaffSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required').max(50).trim(),
  lastName: z.string().min(1, 'Last name is required').max(50).trim(),
  role: staffRoleSchema,
});

export type StaffRole = z.infer<typeof staffRoleSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

// Role permissions
export const ROLE_PERMISSIONS = {
  OWNER: ['*'],
  ADMIN: [
    'gym:read',
    'gym:update',
    'members:*',
    'staff:*',
    'classes:*',
    'bookings:*',
    'subscriptions:*',
    'analytics:read',
  ],
  MANAGER: [
    'gym:read',
    'members:*',
    'staff:read',
    'classes:*',
    'bookings:*',
    'subscriptions:read',
    'analytics:read',
  ],
  INSTRUCTOR: ['gym:read', 'members:read', 'classes:read', 'bookings:read'],
  FRONT_DESK: ['gym:read', 'members:read', 'members:checkin', 'classes:read', 'bookings:*'],
} as const;
