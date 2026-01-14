import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@gym/database";
import { getSession, getStaffWithGym } from "@/lib/auth";

// POST /api/campaigns/[id]/send - Send a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return NextResponse.json({ error: "No gym access" }, { status: 403 });
    }

    const { id } = await params;

    // Get campaign
    const campaign = await prisma.campaign.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === "SENT") {
      return NextResponse.json(
        { error: "Campaign already sent" },
        { status: 400 }
      );
    }

    // Get recipients based on target audience
    let members: { id: string; email: string; phone: string | null; firstName: string }[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (campaign.targetAudience === "all") {
      members = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true, email: true, phone: true, firstName: true },
      });
    } else if (campaign.targetAudience === "new_members") {
      // Members who joined in the last 30 days
      members = await prisma.member.findMany({
        where: {
          gymId: staff.gymId,
          status: "ACTIVE",
          joinedAt: { gte: thirtyDaysAgo },
        },
        select: { id: true, email: true, phone: true, firstName: true },
      });
    } else if (campaign.targetAudience === "super_active") {
      // Members with 10+ check-ins this month
      const activeMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true, email: true, phone: true, firstName: true },
      });

      for (const member of activeMembers) {
        const checkInCount = await prisma.checkIn.count({
          where: {
            memberId: member.id,
            checkedInAt: { gte: startOfMonth },
          },
        });
        if (checkInCount >= 10) members.push(member);
      }
    } else if (campaign.targetAudience === "regular") {
      // Members with 4-9 check-ins this month
      const activeMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true, email: true, phone: true, firstName: true },
      });

      for (const member of activeMembers) {
        const checkInCount = await prisma.checkIn.count({
          where: {
            memberId: member.id,
            checkedInAt: { gte: startOfMonth },
          },
        });
        if (checkInCount >= 4 && checkInCount <= 9) members.push(member);
      }
    } else if (campaign.targetAudience === "at_risk") {
      // Members with no check-in in 14+ days but less than 30
      const activeMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true, email: true, phone: true, firstName: true },
      });

      for (const member of activeMembers) {
        const lastCheckIn = await prisma.checkIn.findFirst({
          where: { memberId: member.id },
          orderBy: { checkedInAt: "desc" },
        });
        if (lastCheckIn) {
          const daysSinceCheckIn = Math.floor(
            (now.getTime() - lastCheckIn.checkedInAt.getTime()) / (24 * 60 * 60 * 1000)
          );
          if (daysSinceCheckIn >= 14 && daysSinceCheckIn < 30) members.push(member);
        }
      }
    } else if (campaign.targetAudience === "inactive") {
      // Members with no check-in in 30+ days
      const activeMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE" },
        select: { id: true, email: true, phone: true, firstName: true },
      });

      for (const member of activeMembers) {
        const lastCheckIn = await prisma.checkIn.findFirst({
          where: { memberId: member.id },
          orderBy: { checkedInAt: "desc" },
        });
        if (
          !lastCheckIn ||
          now.getTime() - lastCheckIn.checkedInAt.getTime() >= 30 * 24 * 60 * 60 * 1000
        ) {
          members.push(member);
        }
      }
    } else if (campaign.targetAudience === "expiring_soon") {
      // Members whose subscription expires in the next 14 days
      members = await prisma.member.findMany({
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
        select: { id: true, email: true, phone: true, firstName: true },
      });
    } else if (campaign.targetAudience === "birthday_this_month") {
      // Members with birthday this month
      const allMembers = await prisma.member.findMany({
        where: { gymId: staff.gymId, status: "ACTIVE", dateOfBirth: { not: null } },
        select: { id: true, email: true, phone: true, firstName: true, dateOfBirth: true },
      });

      const currentMonth = now.getMonth();
      members = allMembers
        .filter((m) => m.dateOfBirth && m.dateOfBirth.getMonth() === currentMonth)
        .map(({ dateOfBirth, ...rest }) => rest);
    } else if (campaign.targetAudience === "tag" && campaign.targetTagId) {
      const memberTags = await prisma.memberTag.findMany({
        where: {
          tagId: campaign.targetTagId,
          member: { gymId: staff.gymId, status: "ACTIVE" },
        },
        include: {
          member: {
            select: { id: true, email: true, phone: true, firstName: true },
          },
        },
      });
      members = memberTags.map((mt) => mt.member);
    }

    // In a real application, you would:
    // 1. Queue the emails/SMS for sending via a service like SendGrid, Twilio, etc.
    // 2. Update stats as messages are delivered
    // For now, we'll just simulate the send

    const sentCount = members.length;

    // Update campaign status
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        sentCount,
        recipientCount: sentCount,
        // Simulate some stats
        deliveredCount: Math.floor(sentCount * 0.98),
        openedCount: campaign.type === "EMAIL" ? Math.floor(sentCount * 0.35) : sentCount,
        clickedCount: campaign.type === "EMAIL" ? Math.floor(sentCount * 0.12) : 0,
        bouncedCount: Math.floor(sentCount * 0.02),
      },
    });

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      recipientsSent: sentCount,
    });
  } catch (error) {
    console.error("Error sending campaign:", error);
    return NextResponse.json(
      { error: "Failed to send campaign" },
      { status: 500 }
    );
  }
}
