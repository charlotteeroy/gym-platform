import { z } from 'zod';

export const frequencySchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export const sessionStatusSchema = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const bookingStatusSchema = z.enum(['CONFIRMED', 'CANCELLED', 'NO_SHOW', 'ATTENDED']);
export const dayOfWeekSchema = z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

export const createClassSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  waitlistEnabled: z.boolean().default(true),
  waitlistMax: z.coerce.number().int().min(0).default(10),
  durationMinutes: z.coerce.number().int().min(15, 'Duration must be at least 15 minutes'),
  bookingOpensHours: z.coerce.number().int().min(1).default(168), // 7 days
  bookingClosesMinutes: z.coerce.number().int().min(0).default(30),
  cancellationMinutes: z.coerce.number().int().min(0).default(120),
  creditsRequired: z.coerce.number().int().min(0).default(1),
  instructorId: z.string().cuid('Invalid instructor ID').optional(),
  isActive: z.boolean().default(true),
});

export const updateClassSchema = createClassSchema.partial();

export const recurrenceRuleSchema = z.object({
  frequency: frequencySchema,
  interval: z.coerce.number().int().min(1).default(1),
  byDay: z.array(dayOfWeekSchema).min(1, 'Select at least one day'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const createSessionSchema = z.object({
  classId: z.string().cuid('Invalid class ID'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  capacityOverride: z.coerce.number().int().min(1).optional(),
});

export const bookClassSchema = z.object({
  sessionId: z.string().cuid('Invalid session ID'),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().cuid('Invalid booking ID'),
  reason: z.string().max(200).optional(),
});

export type Frequency = z.infer<typeof frequencySchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type BookClassInput = z.infer<typeof bookClassSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

// Day of week mapping
export const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
