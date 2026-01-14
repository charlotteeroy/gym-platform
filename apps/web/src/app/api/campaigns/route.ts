import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@gym/database";
import { getSession, getStaffWithGym } from "@/lib/auth";

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return NextResponse.json({ error: "No gym access" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'EMAIL' or 'SMS'
    const status = searchParams.get("status");

    const where: any = { gymId: staff.gymId };
    if (type) where.type = type;
    if (status) where.status = status;

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return NextResponse.json({ error: "No gym access" }, { status: 403 });
    }

    const data = await request.json();
    const {
      name,
      type,
      subject,
      content,
      targetAudience,
      targetTagId,
      scheduledAt,
    } = data;

    // Calculate recipient count based on audience
    let recipientCount = 0;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (targetAudience === "all") {
      recipientCount = await prisma.member.count({
        where: { gymId: staff.gymId, status: "ACTIVE" }
      });
    } else if (targetAudience === "new_members") {
      // Members who joined in the last 30 days
      recipientCount = await prisma.member.count({
        where: {
          gymId: staff.gymId,
          status: "ACTIVE",
          joinedAt: { gte: thirtyDaysAgo }
        }
      });
    } else if (targetAudience === "super_active") {
      // Members with 10+ check-ins this month
      const activeMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true },
      });

      let count = 0;
      for (const member of activeMembers) {
        const checkInCount = await prisma.checkIn.count({
          where: {
            memberId: member.id,
            checkedInAt: { gte: startOfMonth },
          },
        });
        if (checkInCount >= 10) count++;
      }
      recipientCount = count;
    } else if (targetAudience === "regular") {
      // Members with 4-9 check-ins this month
      const activeMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true },
      });

      let count = 0;
      for (const member of activeMembers) {
        const checkInCount = await prisma.checkIn.count({
          where: {
            memberId: member.id,
            checkedInAt: { gte: startOfMonth },
          },
        });
        if (checkInCount >= 4 && checkInCount <= 9) count++;
      }
      recipientCount = count;
    } else if (targetAudience === "at_risk") {
      // Members with no check-in in 14+ days but less than 30
      const atRiskMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true },
      });

      let count = 0;
      for (const member of atRiskMembers) {
        const lastCheckIn = await prisma.checkIn.findFirst({
          where: { memberId: member.id },
          orderBy: { checkedInAt: "desc" },
        });
        if (lastCheckIn) {
          const daysSinceCheckIn = Math.floor((now.getTime() - lastCheckIn.checkedInAt.getTime()) / (24 * 60 * 60 * 1000));
          if (daysSinceCheckIn >= 14 && daysSinceCheckIn < 30) count++;
        }
      }
      recipientCount = count;
    } else if (targetAudience === "inactive") {
      // Members with no check-in in 30+ days
      const inactiveMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true },
      });

      let count = 0;
      for (const member of inactiveMembers) {
        const lastCheckIn = await prisma.checkIn.findFirst({
          where: { memberId: member.id },
          orderBy: { checkedInAt: "desc" },
        });
        if (!lastCheckIn || (now.getTime() - lastCheckIn.checkedInAt.getTime()) >= 30 * 24 * 60 * 60 * 1000) {
          count++;
        }
      }
      recipientCount = count;
    } else if (targetAudience === "expiring_soon") {
      // Members whose subscription expires in the next 14 days
      recipientCount = await prisma.member.count({
        where: {
          gymId: staff.gymId,
          status: "ACTIVE",
          subscription: {
            currentPeriodEnd: {
              gte: now,
              lte: fourteenDaysFromNow,
            },
          },
        },
      });
    } else if (targetAudience === "birthday_this_month") {
      // Members with birthday this month
      const members = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE", dateOfBirth: { not: null } },
        select: { dateOfBirth: true },
      });

      const currentMonth = now.getMonth();
      recipientCount = members.filter(m =>
        m.dateOfBirth && m.dateOfBirth.getMonth() === currentMonth
      ).length;
    } else if (targetAudience === "tag" && targetTagId) {
      recipientCount = await prisma.memberTag.count({
        where: {
          tagId: targetTagId,
          member: { gymId: staff.gymId, status: "ACTIVE" },
        },
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        type,
        subject: type === "EMAIL" ? subject : null,
        content,
        targetAudience,
        targetTagId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        recipientCount,
        gymId: staff.gymId,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
