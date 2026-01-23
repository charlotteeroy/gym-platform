import { prisma } from '@gym/database';

// Engagement Tiers based on visits per month
// From CLAUDE.md product vision
export const ENGAGEMENT_TIERS = {
  SUPER_ACTIVE: { name: 'Platinum', minVisits: 16, color: '#8B5CF6' },  // Purple
  HIGH_ACTIVE: { name: 'Gold', minVisits: 10, color: '#F59E0B' },       // Amber
  ACTIVE: { name: 'Silver', minVisits: 5, color: '#6B7280' },          // Gray
  LOW_ACTIVE: { name: 'Bronze', minVisits: 1, color: '#CD7F32' },      // Bronze
  DORMANT: { name: 'Inactive', minVisits: 0, color: '#EF4444' },       // Red
} as const;

export type TierName = typeof ENGAGEMENT_TIERS[keyof typeof ENGAGEMENT_TIERS]['name'];

export interface MemberTier {
  memberId: string;
  memberName: string;
  currentTier: TierName;
  previousTier: TierName;
  currentVisits: number;
  previousVisits: number;
  movement: 'up' | 'down' | 'same';
}

export interface TierProgression {
  movedUp: number;
  movedDown: number;
  maintained: number;
  topProgressions: MemberTier[];
  topRegressions: MemberTier[];
  summary: {
    platinum: number;
    gold: number;
    silver: number;
    bronze: number;
    inactive: number;
  };
}

function getTierFromVisits(visitsPerMonth: number): TierName {
  if (visitsPerMonth >= ENGAGEMENT_TIERS.SUPER_ACTIVE.minVisits) return 'Platinum';
  if (visitsPerMonth >= ENGAGEMENT_TIERS.HIGH_ACTIVE.minVisits) return 'Gold';
  if (visitsPerMonth >= ENGAGEMENT_TIERS.ACTIVE.minVisits) return 'Silver';
  if (visitsPerMonth >= ENGAGEMENT_TIERS.LOW_ACTIVE.minVisits) return 'Bronze';
  return 'Inactive';
}

function getTierRank(tier: TierName): number {
  switch (tier) {
    case 'Platinum': return 5;
    case 'Gold': return 4;
    case 'Silver': return 3;
    case 'Bronze': return 2;
    case 'Inactive': return 1;
    default: return 0;
  }
}

export async function getMemberProgression(gymId: string): Promise<TierProgression> {
  const now = new Date();

  // Current period: last 30 days
  const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Previous period: 30-60 days ago
  const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const previousPeriodEnd = currentPeriodStart;

  // Get all active members
  const members = await prisma.member.findMany({
    where: { gymId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
  });

  // Get check-ins for both periods
  const checkIns = await prisma.checkIn.findMany({
    where: {
      gymId,
      checkedInAt: { gte: previousPeriodStart },
    },
    select: { memberId: true, checkedInAt: true },
  });

  // Calculate visits per member for each period
  const memberVisits: Record<string, { current: number; previous: number }> = {};

  members.forEach((member) => {
    memberVisits[member.id] = { current: 0, previous: 0 };
  });

  checkIns.forEach((checkIn) => {
    const visits = memberVisits[checkIn.memberId];
    if (!visits) return;

    const checkInTime = new Date(checkIn.checkedInAt).getTime();

    if (checkInTime >= currentPeriodStart.getTime()) {
      visits.current++;
    } else if (checkInTime >= previousPeriodStart.getTime() && checkInTime < previousPeriodEnd.getTime()) {
      visits.previous++;
    }
  });

  // Calculate tier movements
  const memberTiers: MemberTier[] = members.map((member) => {
    const visits = memberVisits[member.id] || { current: 0, previous: 0 };
    const currentTier = getTierFromVisits(visits.current);
    const previousTier = getTierFromVisits(visits.previous);
    const currentRank = getTierRank(currentTier);
    const previousRank = getTierRank(previousTier);

    let movement: 'up' | 'down' | 'same' = 'same';
    if (currentRank > previousRank) movement = 'up';
    else if (currentRank < previousRank) movement = 'down';

    return {
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      currentTier,
      previousTier,
      currentVisits: visits.current,
      previousVisits: visits.previous,
      movement,
    };
  });

  // Count movements
  const movedUp = memberTiers.filter((m) => m.movement === 'up').length;
  const movedDown = memberTiers.filter((m) => m.movement === 'down').length;
  const maintained = memberTiers.filter((m) => m.movement === 'same').length;

  // Get top progressions (moved up, sorted by tier difference)
  const topProgressions = memberTiers
    .filter((m) => m.movement === 'up')
    .sort((a, b) => {
      const aDiff = getTierRank(a.currentTier) - getTierRank(a.previousTier);
      const bDiff = getTierRank(b.currentTier) - getTierRank(b.previousTier);
      return bDiff - aDiff;
    })
    .slice(0, 5);

  // Get top regressions (moved down)
  const topRegressions = memberTiers
    .filter((m) => m.movement === 'down')
    .sort((a, b) => {
      const aDiff = getTierRank(a.previousTier) - getTierRank(a.currentTier);
      const bDiff = getTierRank(b.previousTier) - getTierRank(b.currentTier);
      return bDiff - aDiff;
    })
    .slice(0, 5);

  // Count members in each tier
  const summary = {
    platinum: memberTiers.filter((m) => m.currentTier === 'Platinum').length,
    gold: memberTiers.filter((m) => m.currentTier === 'Gold').length,
    silver: memberTiers.filter((m) => m.currentTier === 'Silver').length,
    bronze: memberTiers.filter((m) => m.currentTier === 'Bronze').length,
    inactive: memberTiers.filter((m) => m.currentTier === 'Inactive').length,
  };

  return {
    movedUp,
    movedDown,
    maintained,
    topProgressions,
    topRegressions,
    summary,
  };
}

export function getTierColor(tier: TierName): string {
  switch (tier) {
    case 'Platinum': return ENGAGEMENT_TIERS.SUPER_ACTIVE.color;
    case 'Gold': return ENGAGEMENT_TIERS.HIGH_ACTIVE.color;
    case 'Silver': return ENGAGEMENT_TIERS.ACTIVE.color;
    case 'Bronze': return ENGAGEMENT_TIERS.LOW_ACTIVE.color;
    case 'Inactive': return ENGAGEMENT_TIERS.DORMANT.color;
    default: return '#6B7280';
  }
}
