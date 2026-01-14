// Auth service
export {
  type AuthResult,
  type MemberAuthResult,
  type TokenValidationResult,
  hashPassword,
  verifyPassword,
  registerUser,
  registerMember,
  loginUser,
  validateSession,
  logout,
  logoutAllSessions,
  createPasswordResetToken,
  resetPassword,
  changePassword,
} from './auth.service';

// Gym service
export {
  type GymResult,
  type GymWithStaff,
  createGym,
  getGymById,
  getGymBySlug,
  getGymWithStaff,
  updateGym,
  isSlugAvailable,
  generateUniqueSlug,
  getGymStats,
} from './gym.service';

// Member service
export {
  type MemberResult,
  type MemberWithSubscription,
  type MemberAnalytics,
  type MemberProfile,
  createMember,
  getMemberById,
  getMemberWithSubscription,
  getMemberByUserId,
  updateMember,
  updateMemberStatus,
  listMembers,
  checkInMember,
  getMemberCheckIns,
  getMemberStats,
  getMemberAnalytics,
  getMemberProfile,
  deleteMember,
} from './member.service';

// Staff service
export {
  type StaffResult,
  createStaff,
  getStaffById,
  getStaffByUserId,
  updateStaff,
  deactivateStaff,
  reactivateStaff,
  listStaff,
  listInstructors,
  hasPermission,
  canManageStaff,
} from './staff.service';

// Subscription service
export {
  type PlanResult,
  type SubscriptionResult,
  createMembershipPlan,
  getMembershipPlanById,
  updateMembershipPlan,
  listMembershipPlans,
  assignSubscription,
  getMemberSubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  processExpiredSubscriptions,
} from './subscription.service';

// Class service
export {
  type ClassResult,
  type SessionResult,
  createClass,
  getClassById,
  getClassWithSessions,
  updateClass,
  deactivateClass,
  listClasses,
  createRecurrenceRule,
  createClassSession,
  getSessionById,
  getSessionWithDetails,
  cancelSession,
  getUpcomingSessions,
  getSessionAvailability,
} from './class.service';

// Booking service
export {
  type BookingResult,
  type WaitlistResult,
  bookSession,
  cancelBooking,
  joinWaitlist,
  leaveWaitlist,
  markAttended,
  markNoShow,
  getMemberBookings,
} from './booking.service';

// Stripe service
export {
  stripe,
  createStripeCustomer,
  syncPlanToStripe,
  createCheckoutSession,
  createBillingPortalSession,
  handleStripeWebhook,
} from './stripe.service';

// Analytics service
export {
  type GymHealthScore,
  type Alert,
  type AtRiskMember,
  type TrendData,
  getGymHealth,
  getAlerts,
  getAtRiskMembers,
  getTrends,
  getQuickStats,
} from './analytics.service';

// Tag service
export {
  type TagResult,
  type MemberTagResult,
  createTag,
  updateTag,
  deleteTag,
  getTagById,
  listTags,
  addTagToMember,
  removeTagFromMember,
  getMemberTags,
  getMembersByTag,
  createDefaultTags,
} from './tag.service';
