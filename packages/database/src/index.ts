// Re-export Prisma client
export { prisma, type PrismaClient } from './client';

// Re-export all generated types from Prisma
export * from '@prisma/client';

// Export commonly used types for convenience
export type {
  Gym,
  User,
  Session,
  Member,
  Staff,
  MembershipPlan,
  Subscription,
  Class,
  ClassSession,
  RecurrenceRule,
  Booking,
  WaitlistEntry,
  CheckIn,
} from '@prisma/client';
