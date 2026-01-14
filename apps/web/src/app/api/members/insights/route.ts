import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';

// GET /api/members/insights - Get member insights and summary
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    const gymId = staff.gymId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all members with their check-ins
    const members = await prisma.member.findMany({
      where: { gymId },
      include: {
        checkIns: {
          where: { checkedInAt: { gte: thirtyDaysAgo } },
          select: { checkedInAt: true },
        },
        tags: {
          include: { tag: { select: { name: true } } },
        },
      },
    });

    // Calculate metrics
    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.status === 'ACTIVE').length;
    const newThisMonth = members.filter((m) => new Date(m.createdAt) >= startOfMonth).length;

    // Activity breakdown
    let highActivity = 0;
    let mediumActivity = 0;
    let lowActivity = 0;
    let inactive = 0;

    // At-risk: active members with no visits in 14+ days
    let atRisk = 0;

    // Hourly distribution
    const hourlyVisits: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyVisits[i] = 0;

    // Day of week distribution
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyVisits: Record<string, number> = {};
    dayNames.forEach((d) => (dailyVisits[d] = 0));

    members.forEach((member) => {
      const visitCount = member.checkIns.length;

      // Activity level
      if (visitCount >= 12) highActivity++;
      else if (visitCount >= 4) mediumActivity++;
      else if (visitCount >= 1) lowActivity++;
      else inactive++;

      // At-risk calculation
      if (member.status === 'ACTIVE') {
        const lastVisit = member.checkIns.length > 0
          ? member.checkIns.reduce((latest, c) =>
              c.checkedInAt > latest.checkedInAt ? c : latest
            ).checkedInAt
          : null;

        if (!lastVisit || lastVisit < fourteenDaysAgo) {
          atRisk++;
        }
      }

      // Hourly and daily distribution
      member.checkIns.forEach((checkIn) => {
        const hour = checkIn.checkedInAt.getHours();
        const day = dayNames[checkIn.checkedInAt.getDay()];
        if (hourlyVisits[hour] !== undefined) hourlyVisits[hour]++;
        if (day && dailyVisits[day] !== undefined) dailyVisits[day]++;
      });
    });

    // Find peak times
    const peakHour = Object.entries(hourlyVisits).reduce(
      (max, [hour, count]) => (count > max.count ? { hour: parseInt(hour), count } : max),
      { hour: 0, count: 0 }
    );

    const peakDay = Object.entries(dailyVisits).reduce(
      (max, [day, count]) => (count > max.count ? { day, count } : max),
      { day: '', count: 0 }
    );

    // Tag distribution
    const tagCounts: Record<string, number> = {};
    members.forEach((member) => {
      member.tags.forEach((mt) => {
        const tagName = mt.tag.name;
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Format hour for display
    const formatHour = (hour: number) => {
      if (hour === 0) return '12am';
      if (hour === 12) return '12pm';
      if (hour < 12) return `${hour}am`;
      return `${hour - 12}pm`;
    };

    // Calculate total visits for percentages
    const totalVisits = Object.values(hourlyVisits).reduce((a, b) => a + b, 0);

    // Get top 3 peak hours with percentages
    const topHours = Object.entries(hourlyVisits)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        label: formatHour(parseInt(hour)),
        count,
        percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Get top 3 peak days with percentages
    const topDays = Object.entries(dailyVisits)
      .map(([day, count]) => ({
        day,
        count,
        percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return apiSuccess({
      summary: {
        totalMembers,
        activeMembers,
        newThisMonth,
        atRisk,
      },
      activity: {
        high: highActivity,
        medium: mediumActivity,
        low: lowActivity,
        inactive,
      },
      insights: {
        peakTime: peakHour.count > 0 ? formatHour(peakHour.hour) : null,
        peakDay: peakDay.count > 0 ? peakDay.day : null,
        avgVisitsPerMember: totalMembers > 0
          ? Math.round((Object.values(hourlyVisits).reduce((a, b) => a + b, 0) / totalMembers) * 10) / 10
          : 0,
      },
      traffic: {
        totalVisits,
        topHours,
        topDays,
      },
      topTags,
      hourlyDistribution: Object.entries(hourlyVisits).map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      })),
    });
  } catch (error) {
    console.error('Get member insights error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get member insights' }, 500);
  }
}
