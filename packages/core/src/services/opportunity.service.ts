/**
 * Opportunity Detection Service
 *
 * Purpose: Automatically identifies upsell and revenue opportunities based on member behavior
 * Product Context: Supports "Long-term Resilience" pillar with revenue diversification
 *
 * @see CLAUDE.md - Opportunities/Upsell System
 */

import { prisma, Prisma } from '@gym/database';

// =============================================================================
// TYPES
// =============================================================================

export type OpportunityType = 'UPGRADE' | 'PERSONAL_TRAINING' | 'RENEWAL' | 'ADDON' | 'CROSS_SELL';
export type OpportunityConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type OpportunityStatus = 'NEW' | 'CONTACTED' | 'FOLLOW_UP' | 'WON' | 'LOST' | 'DISMISSED' | 'EXPIRED';

export interface DetectedOpportunity {
  type: OpportunityType;
  memberId: string;
  confidence: OpportunityConfidence;
  confidenceScore: number;
  title: string;
  description: string;
  reason: string;
  potentialValue: number;
  recommendedAction: string;
  recommendedProduct?: string;
  targetPlanId?: string;
  targetProductId?: string;
  expiresAt?: Date;
  scoringFactors: Record<string, number | string | boolean>;
}

export interface OpportunityFilters {
  types?: OpportunityType[];
  statuses?: OpportunityStatus[];
  confidence?: OpportunityConfidence[];
  memberId?: string;
  minValue?: number;
  page?: number;
  limit?: number;
}

export interface OpportunitySummary {
  totalOpportunities: number;
  totalPotentialValue: number;
  byType: Record<string, { count: number; value: number }>;
  byConfidence: Record<string, { count: number; value: number }>;
  byStatus: Record<string, number>;
  conversionRate: number;
  avgDaysToConvert: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MONTHLY_MULTIPLIER: Record<string, number> = {
  WEEKLY: 4.33,
  MONTHLY: 1,
  QUARTERLY: 0.333,
  YEARLY: 0.0833,
};

// =============================================================================
// UPGRADE OPPORTUNITY DETECTION
// =============================================================================

/**
 * Detect members on lower plans who show high engagement (upgrade candidates)
 */
export async function detectUpgradeOpportunities(gymId: string): Promise<DetectedOpportunity[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get all membership plans ordered by price
  const plans = await prisma.membershipPlan.findMany({
    where: { gymId, isActive: true },
    orderBy: { priceAmount: 'asc' },
  });

  if (plans.length < 2) return [];

  // Get members with active subscriptions
  const members = await prisma.member.findMany({
    where: {
      gymId,
      status: 'ACTIVE',
      subscription: { status: 'ACTIVE' },
    },
    include: {
      subscription: { include: { plan: true } },
      checkIns: {
        where: { checkedInAt: { gte: thirtyDaysAgo } },
        select: { id: true },
      },
      bookings: {
        where: {
          status: { in: ['CONFIRMED', 'ATTENDED'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        include: { session: { include: { class: true } } },
      },
    },
  });

  const opportunities: DetectedOpportunity[] = [];

  for (const member of members) {
    if (!member.subscription) continue;

    const currentPlan = member.subscription.plan;
    const monthlyVisits = member.checkIns.length;
    const classBookings = member.bookings.length;

    // Find higher tier plans
    const higherPlans = plans.filter(
      p => Number(p.priceAmount) > Number(currentPlan.priceAmount)
    );

    if (higherPlans.length === 0) continue;

    // Only target Active or higher for upgrades (5+ visits/month)
    if (monthlyVisits < 5) continue;

    // Score the opportunity
    let confidenceScore = 0;
    const reasons: string[] = [];

    // Engagement tier scoring
    if (monthlyVisits >= 16) {
      confidenceScore += 40;
      reasons.push(`Super Active with ${monthlyVisits} visits/month`);
    } else if (monthlyVisits >= 10) {
      confidenceScore += 30;
      reasons.push(`High Active with ${monthlyVisits} visits/month`);
    } else {
      confidenceScore += 20;
      reasons.push(`Active with ${monthlyVisits} visits/month`);
    }

    // Class participation boost
    if (classBookings >= 8) {
      confidenceScore += 20;
      reasons.push(`Takes ${classBookings}+ classes/month`);
    } else if (classBookings >= 4) {
      confidenceScore += 10;
      reasons.push('Regular class attendee');
    }

    // Long tenure boost
    const membershipMonths = Math.floor(
      (Date.now() - new Date(member.joinedAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    if (membershipMonths >= 12) {
      confidenceScore += 15;
      reasons.push(`Loyal member for ${membershipMonths}+ months`);
    } else if (membershipMonths >= 6) {
      confidenceScore += 10;
      reasons.push('Established member');
    }

    // Near plan limits
    if (currentPlan.classCredits !== -1 && currentPlan.classCredits !== null) {
      if (classBookings >= (currentPlan.classCredits * 0.8)) {
        confidenceScore += 15;
        reasons.push(`Using ${Math.round((classBookings / currentPlan.classCredits) * 100)}% of class credits`);
      }
    }

    // Determine confidence level
    let confidence: OpportunityConfidence;
    if (confidenceScore >= 70) confidence = 'HIGH';
    else if (confidenceScore >= 40) confidence = 'MEDIUM';
    else confidence = 'LOW';

    // Calculate potential value
    const recommendedPlan = higherPlans[0]!;
    const currentMonthly = Number(currentPlan.priceAmount) * (MONTHLY_MULTIPLIER[currentPlan.billingInterval] || 1);
    const upgradeMonthly = Number(recommendedPlan.priceAmount) * (MONTHLY_MULTIPLIER[recommendedPlan.billingInterval] || 1);
    const potentialValue = upgradeMonthly - currentMonthly;

    opportunities.push({
      type: 'UPGRADE',
      memberId: member.id,
      confidence,
      confidenceScore,
      title: `Upgrade to ${recommendedPlan.name}`,
      description: `${member.firstName} is on ${currentPlan.name} but shows high engagement.`,
      reason: reasons.join('. '),
      potentialValue,
      recommendedAction: confidenceScore >= 70
        ? `Offer upgrade to ${recommendedPlan.name} - no discount needed`
        : `Offer ${recommendedPlan.name} with 10% first month discount`,
      recommendedProduct: recommendedPlan.name,
      targetPlanId: recommendedPlan.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      scoringFactors: {
        monthlyVisits,
        classBookings,
        membershipMonths,
        currentPlanPrice: Number(currentPlan.priceAmount),
      },
    });
  }

  return opportunities.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

// =============================================================================
// PERSONAL TRAINING OPPORTUNITY DETECTION
// =============================================================================

/**
 * Detect active members who haven't purchased PT sessions
 */
export async function detectPTOpportunities(gymId: string): Promise<DetectedOpportunity[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Get PT products
  const ptProducts = await prisma.product.findMany({
    where: { gymId, type: 'PT_SESSION', isActive: true },
    orderBy: { priceAmount: 'asc' },
  });

  if (ptProducts.length === 0) return [];

  // Get active members who haven't purchased PT
  const members = await prisma.member.findMany({
    where: {
      gymId,
      status: 'ACTIVE',
      subscription: { status: 'ACTIVE' },
      purchases: {
        none: {
          product: { type: 'PT_SESSION' },
          status: 'COMPLETED',
        },
      },
    },
    include: {
      subscription: { include: { plan: true } },
      checkIns: {
        where: { checkedInAt: { gte: thirtyDaysAgo } },
        select: { id: true },
      },
      bookings: {
        where: { createdAt: { gte: ninetyDaysAgo } },
        include: { session: { include: { class: true } } },
      },
    },
  });

  const opportunities: DetectedOpportunity[] = [];
  const starterPT = ptProducts[0]!;

  for (const member of members) {
    const monthlyVisits = member.checkIns.length;

    // Skip low engagement members
    if (monthlyVisits < 3) continue;

    let confidenceScore = 0;
    const reasons: string[] = [];

    // Engagement scoring
    if (monthlyVisits >= 10) {
      confidenceScore += 30;
      reasons.push(`Highly active with ${monthlyVisits} visits/month`);
    } else if (monthlyVisits >= 5) {
      confidenceScore += 20;
      reasons.push(`Regular visitor with ${monthlyVisits} visits/month`);
    } else {
      confidenceScore += 10;
      reasons.push('Consistent attendance');
    }

    // New member bonus (first 90 days - prime PT window)
    const memberAgeDays = Math.floor(
      (Date.now() - new Date(member.joinedAt).getTime()) / (24 * 60 * 60 * 1000)
    );
    if (memberAgeDays <= 90) {
      confidenceScore += 25;
      reasons.push('New member in first 90 days (prime PT window)');
    } else if (memberAgeDays <= 180) {
      confidenceScore += 15;
      reasons.push('Member for 3-6 months, may need guidance');
    }

    // Premium plan members more likely to buy PT
    const planPrice = member.subscription?.plan ? Number(member.subscription.plan.priceAmount) : 0;
    if (planPrice >= 100) {
      confidenceScore += 15;
      reasons.push('Premium plan member');
    }

    // Plateau detection
    const classTypes = new Set(member.bookings.map(b => b.session.class.name));
    if (member.bookings.length >= 8 && classTypes.size <= 2) {
      confidenceScore += 15;
      reasons.push('May be experiencing workout plateau');
    }

    let confidence: OpportunityConfidence;
    if (confidenceScore >= 70) confidence = 'HIGH';
    else if (confidenceScore >= 40) confidence = 'MEDIUM';
    else confidence = 'LOW';

    opportunities.push({
      type: 'PERSONAL_TRAINING',
      memberId: member.id,
      confidence,
      confidenceScore,
      title: 'Personal Training Introduction',
      description: `${member.firstName} is active but hasn't tried personal training yet.`,
      reason: reasons.join('. '),
      potentialValue: Number(starterPT.priceAmount),
      recommendedAction: memberAgeDays <= 90
        ? 'Offer complimentary PT consultation as part of new member welcome'
        : 'Suggest intro PT package with 10% first-session discount',
      recommendedProduct: starterPT.name,
      targetProductId: starterPT.id,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      scoringFactors: {
        monthlyVisits,
        memberAgeDays,
        planPrice,
        classVariety: classTypes.size,
      },
    });
  }

  return opportunities.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

// =============================================================================
// RENEWAL OPPORTUNITY DETECTION
// =============================================================================

/**
 * Detect subscriptions expiring soon for proactive renewal outreach
 */
export async function detectRenewalOpportunities(gymId: string): Promise<DetectedOpportunity[]> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Only get subscriptions that are AT RISK:
  // 1. Scheduled to cancel (cancelAtPeriodEnd = true)
  // Auto-renewing subscriptions don't need renewal reminders - Stripe handles them
  const atRiskSubscriptions = await prisma.subscription.findMany({
    where: {
      member: { gymId, status: 'ACTIVE' },
      status: 'ACTIVE',
      cancelAtPeriodEnd: true, // Only subscriptions scheduled to cancel
      currentPeriodEnd: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      member: {
        include: {
          checkIns: {
            where: { checkedInAt: { gte: thirtyDaysAgo } },
            select: { id: true },
          },
        },
      },
      plan: true,
    },
  });

  const opportunities: DetectedOpportunity[] = [];

  for (const subscription of atRiskSubscriptions) {
    const member = subscription.member;
    const daysUntilExpiry = Math.floor(
      (subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const monthlyVisits = member.checkIns.length;

    let confidenceScore = 50; // Base score - they've scheduled to cancel
    const reasons: string[] = ['Scheduled to cancel - win-back opportunity'];

    // Urgency scoring
    if (daysUntilExpiry <= 7) {
      confidenceScore += 20;
      reasons.push(`Cancels in ${daysUntilExpiry} days - urgent!`);
    } else if (daysUntilExpiry <= 14) {
      confidenceScore += 10;
      reasons.push(`Cancels in ${daysUntilExpiry} days`);
    }

    // Engagement - higher engagement = more likely to save
    if (monthlyVisits >= 10) {
      confidenceScore += 25;
      reasons.push(`Still highly engaged (${monthlyVisits} visits) - good save potential`);
    } else if (monthlyVisits >= 5) {
      confidenceScore += 15;
      reasons.push('Still visiting - may reconsider');
    } else if (monthlyVisits >= 1) {
      confidenceScore += 5;
      reasons.push('Low activity - may have already moved on');
    }

    // Tenure bonus - longer members are more likely to stay
    const membershipMonths = Math.floor(
      (now.getTime() - new Date(member.joinedAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    if (membershipMonths >= 12) {
      confidenceScore += 15;
      reasons.push(`Loyal member for ${membershipMonths}+ months`);
    } else if (membershipMonths >= 6) {
      confidenceScore += 10;
      reasons.push('Established member');
    }

    let confidence: OpportunityConfidence;
    if (confidenceScore >= 70) confidence = 'HIGH';
    else if (confidenceScore >= 40) confidence = 'MEDIUM';
    else confidence = 'LOW';

    // Calculate annual value
    const monthlyValue = Number(subscription.plan.priceAmount) *
      (MONTHLY_MULTIPLIER[subscription.plan.billingInterval] || 1);
    const annualValue = monthlyValue * 12;

    opportunities.push({
      type: 'RENEWAL',
      memberId: member.id,
      confidence,
      confidenceScore,
      title: 'Save from Cancellation',
      description: `${member.firstName} scheduled to cancel in ${daysUntilExpiry} days.`,
      reason: reasons.join('. '),
      potentialValue: annualValue,
      recommendedAction: 'Personal call to understand concerns and offer retention incentive',
      recommendedProduct: subscription.plan.name,
      targetPlanId: subscription.plan.id,
      expiresAt: subscription.currentPeriodEnd,
      scoringFactors: {
        daysUntilExpiry,
        monthlyVisits,
        membershipMonths,
        cancelAtPeriodEnd: true,
      },
    });
  }

  return opportunities.sort((a, b) => {
    const expiryA = a.expiresAt?.getTime() || 0;
    const expiryB = b.expiresAt?.getTime() || 0;
    if (expiryA !== expiryB) return expiryA - expiryB;
    return b.confidenceScore - a.confidenceScore;
  });
}

// =============================================================================
// ADD-ON OPPORTUNITY DETECTION
// =============================================================================

/**
 * Detect opportunities for class packs based on attendance patterns
 */
export async function detectAddonOpportunities(gymId: string): Promise<DetectedOpportunity[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  // Get class pack products
  const classPackProducts = await prisma.product.findMany({
    where: { gymId, type: 'CLASS_PACK', isActive: true },
    orderBy: { priceAmount: 'asc' },
  });

  if (classPackProducts.length === 0) return [];

  // Get active members with booking patterns
  const members = await prisma.member.findMany({
    where: {
      gymId,
      status: 'ACTIVE',
      subscription: { status: 'ACTIVE' },
    },
    include: {
      subscription: { include: { plan: true } },
      bookings: {
        where: { createdAt: { gte: sixtyDaysAgo } },
        include: { session: { include: { class: true } } },
      },
      purchases: {
        where: { status: 'COMPLETED' },
        include: { product: true },
      },
    },
  });

  const opportunities: DetectedOpportunity[] = [];

  for (const member of members) {
    // Analyze class booking patterns
    const recentBookings = member.bookings.filter(
      b => new Date(b.createdAt) >= thirtyDaysAgo
    );
    const classTypeCounts: Record<string, number> = {};

    for (const booking of member.bookings) {
      const className = booking.session.class.name;
      classTypeCounts[className] = (classTypeCounts[className] || 0) + 1;
    }

    const sortedClasses = Object.entries(classTypeCounts)
      .sort(([, a], [, b]) => b - a);

    if (sortedClasses.length === 0) continue;

    const [topClassName, topClassCount] = sortedClasses[0]!;

    // Check for class pack opportunity (6+ of same class type)
    if (topClassCount >= 6) {
      const hasRecentClassPack = member.purchases.some(
        p => p.product.type === 'CLASS_PACK' &&
          new Date(p.createdAt) >= sixtyDaysAgo
      );

      if (!hasRecentClassPack) {
        let confidenceScore = 0;
        const reasons: string[] = [];

        if (topClassCount >= 12) {
          confidenceScore += 40;
          reasons.push(`Attends ${topClassName} ${topClassCount}+ times in 60 days`);
        } else if (topClassCount >= 8) {
          confidenceScore += 30;
          reasons.push(`Regular ${topClassName} attendee (${topClassCount} sessions)`);
        } else {
          confidenceScore += 20;
          reasons.push(`Consistent ${topClassName} participant`);
        }

        // Near credit limit
        const planCredits = member.subscription?.plan.classCredits;
        if (planCredits !== undefined && planCredits !== -1 && planCredits !== null) {
          const creditsUsed = recentBookings.length;
          if (creditsUsed >= planCredits * 0.9) {
            confidenceScore += 25;
            reasons.push('Near class credit limit');
          }
        }

        // Purchase history
        if (member.purchases.length > 0) {
          confidenceScore += 15;
          reasons.push('Has made purchases before');
        }

        let confidence: OpportunityConfidence;
        if (confidenceScore >= 70) confidence = 'HIGH';
        else if (confidenceScore >= 40) confidence = 'MEDIUM';
        else confidence = 'LOW';

        const recommendedPack = classPackProducts[0]!;

        opportunities.push({
          type: 'ADDON',
          memberId: member.id,
          confidence,
          confidenceScore,
          title: `Class Pack for ${topClassName}`,
          description: `${member.firstName} frequently attends ${topClassName} and may benefit from a class pack.`,
          reason: reasons.join('. '),
          potentialValue: Number(recommendedPack.priceAmount),
          recommendedAction: `Offer ${recommendedPack.name} with emphasis on ${topClassName} classes`,
          recommendedProduct: recommendedPack.name,
          targetProductId: recommendedPack.id,
          expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          scoringFactors: {
            topClassName,
            topClassCount,
            totalBookings: member.bookings.length,
            previousPurchases: member.purchases.length,
          },
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

// =============================================================================
// MAIN DETECTION ORCHESTRATION
// =============================================================================

/**
 * Run all opportunity detection algorithms and save to database
 */
export async function detectAllOpportunities(gymId: string): Promise<{
  detected: number;
  byType: Record<string, number>;
}> {
  // Run all detectors in parallel
  const [upgrade, pt, renewal, addon] = await Promise.all([
    detectUpgradeOpportunities(gymId),
    detectPTOpportunities(gymId),
    detectRenewalOpportunities(gymId),
    detectAddonOpportunities(gymId),
  ]);

  const allOpportunities = [...upgrade, ...pt, ...renewal, ...addon];

  // Check for existing opportunities to avoid duplicates
  const existingOpportunities = await prisma.opportunity.findMany({
    where: {
      gymId,
      status: { in: ['NEW', 'CONTACTED', 'FOLLOW_UP'] },
    },
    select: { memberId: true, type: true },
  });

  const existingSet = new Set(
    existingOpportunities.map(o => `${o.memberId}-${o.type}`)
  );

  // Filter out duplicates
  const newOpportunities = allOpportunities.filter(
    o => !existingSet.has(`${o.memberId}-${o.type}`)
  );

  // Batch create new opportunities
  if (newOpportunities.length > 0) {
    await prisma.opportunity.createMany({
      data: newOpportunities.map(o => ({
        gymId,
        memberId: o.memberId,
        type: o.type,
        status: 'NEW',
        confidence: o.confidence,
        title: o.title,
        description: o.description,
        reason: o.reason,
        potentialValue: o.potentialValue,
        recommendedAction: o.recommendedAction,
        recommendedProduct: o.recommendedProduct,
        targetPlanId: o.targetPlanId,
        targetProductId: o.targetProductId,
        expiresAt: o.expiresAt,
        scoringFactors: o.scoringFactors as Prisma.InputJsonValue,
      })),
    });
  }

  return {
    detected: newOpportunities.length,
    byType: {
      UPGRADE: upgrade.filter(o => !existingSet.has(`${o.memberId}-UPGRADE`)).length,
      PERSONAL_TRAINING: pt.filter(o => !existingSet.has(`${o.memberId}-PERSONAL_TRAINING`)).length,
      RENEWAL: renewal.filter(o => !existingSet.has(`${o.memberId}-RENEWAL`)).length,
      ADDON: addon.filter(o => !existingSet.has(`${o.memberId}-ADDON`)).length,
      CROSS_SELL: 0,
    },
  };
}

// =============================================================================
// OPPORTUNITY MANAGEMENT
// =============================================================================

/**
 * Get opportunities with filtering
 */
export async function getOpportunities(
  gymId: string,
  filters: OpportunityFilters = {}
) {
  const { types, statuses, confidence, memberId, minValue, page = 1, limit = 20 } = filters;

  const where: Prisma.OpportunityWhereInput = { gymId };

  if (types?.length) where.type = { in: types };
  if (statuses?.length) where.status = { in: statuses };
  if (confidence?.length) where.confidence = { in: confidence };
  if (memberId) where.memberId = memberId;
  if (minValue !== undefined) where.potentialValue = { gte: minValue };

  const [items, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        targetPlan: { select: { id: true, name: true, priceAmount: true } },
        targetProduct: { select: { id: true, name: true, priceAmount: true } },
      },
      orderBy: [
        { confidence: 'desc' },
        { potentialValue: 'desc' },
        { detectedAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.opportunity.count({ where }),
  ]);

  return { items, total };
}

/**
 * Get single opportunity with full details
 */
export async function getOpportunityById(opportunityId: string, gymId: string) {
  return prisma.opportunity.findFirst({
    where: { id: opportunityId, gymId },
    include: {
      member: {
        include: {
          subscription: { include: { plan: true } },
          checkIns: {
            where: { checkedInAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            select: { id: true },
          },
        },
      },
      targetPlan: true,
      targetProduct: true,
      actions: { orderBy: { createdAt: 'desc' } },
      conversion: true,
    },
  });
}

/**
 * Update opportunity status
 */
export async function updateOpportunityStatus(
  opportunityId: string,
  status: OpportunityStatus,
  staffId?: string,
  notes?: string
) {
  const updateData: Prisma.OpportunityUpdateInput = { status };

  if (status === 'CONTACTED') {
    updateData.contactedAt = new Date();
    updateData.contactedBy = staffId;
    updateData.contactNotes = notes;
  }

  if (['WON', 'LOST', 'DISMISSED'].includes(status)) {
    updateData.resolvedAt = new Date();
    updateData.resolvedBy = staffId;
    updateData.resolutionNotes = notes;
  }

  return prisma.opportunity.update({
    where: { id: opportunityId },
    data: updateData,
    include: {
      member: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

/**
 * Log an action taken on an opportunity
 */
export async function logOpportunityAction(
  opportunityId: string,
  action: string,
  staffId: string,
  notes?: string
) {
  return prisma.opportunityAction.create({
    data: {
      opportunityId,
      action,
      staffId,
      notes,
    },
  });
}

/**
 * Record a conversion
 */
export async function recordConversion(
  opportunityId: string,
  data: {
    convertedTo: string;
    subscriptionId?: string;
    purchaseId?: string;
    revenueAmount: number;
    revenueType: string;
  }
) {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity) throw new Error('Opportunity not found');

  const daysToConvert = Math.floor(
    (Date.now() - new Date(opportunity.detectedAt).getTime()) / (24 * 60 * 60 * 1000)
  );

  const touchPoints = await prisma.opportunityAction.count({
    where: { opportunityId },
  });

  return prisma.$transaction([
    prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        status: 'WON',
        actualValue: data.revenueAmount,
        resolvedAt: new Date(),
      },
    }),
    prisma.opportunityConversion.create({
      data: {
        opportunityId,
        convertedTo: data.convertedTo,
        subscriptionId: data.subscriptionId,
        purchaseId: data.purchaseId,
        revenueAmount: data.revenueAmount,
        revenueType: data.revenueType,
        daysToConvert,
        touchPoints,
      },
    }),
  ]);
}

/**
 * Get opportunity summary statistics
 */
export async function getOpportunitySummary(gymId: string): Promise<OpportunitySummary> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const opportunities = await prisma.opportunity.findMany({
    where: { gymId },
  });

  const [totalWon, totalResolved] = await Promise.all([
    prisma.opportunity.count({
      where: { gymId, status: 'WON', resolvedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.opportunity.count({
      where: {
        gymId,
        status: { in: ['WON', 'LOST', 'DISMISSED'] },
        resolvedAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  const conversions = await prisma.opportunityConversion.findMany({
    where: { opportunity: { gymId } },
    select: { daysToConvert: true },
  });

  const avgDaysToConvert = conversions.length > 0
    ? conversions.reduce((sum, c) => sum + c.daysToConvert, 0) / conversions.length
    : 0;

  const byType: Record<string, { count: number; value: number }> = {};
  const byConfidence: Record<string, { count: number; value: number }> = {};
  const byStatus: Record<string, number> = {};

  let totalValue = 0;

  for (const opp of opportunities) {
    totalValue += Number(opp.potentialValue);

    if (!byType[opp.type]) byType[opp.type] = { count: 0, value: 0 };
    const typeEntry = byType[opp.type]!;
    typeEntry.count++;
    typeEntry.value += Number(opp.potentialValue);

    if (!byConfidence[opp.confidence]) byConfidence[opp.confidence] = { count: 0, value: 0 };
    const confEntry = byConfidence[opp.confidence]!;
    confEntry.count++;
    confEntry.value += Number(opp.potentialValue);

    byStatus[opp.status] = (byStatus[opp.status] || 0) + 1;
  }

  return {
    totalOpportunities: opportunities.length,
    totalPotentialValue: totalValue,
    byType,
    byConfidence,
    byStatus,
    conversionRate: totalResolved > 0 ? (totalWon / totalResolved) * 100 : 0,
    avgDaysToConvert: Math.round(avgDaysToConvert),
  };
}

/**
 * Mark expired opportunities
 */
export async function expireStaleOpportunities(gymId: string): Promise<number> {
  const result = await prisma.opportunity.updateMany({
    where: {
      gymId,
      status: { in: ['NEW', 'CONTACTED', 'FOLLOW_UP'] },
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  return result.count;
}
