import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@gym/database";
import { getSession, getStaffWithGym } from "@/lib/auth";

// GET /api/campaigns/[id] - Get a specific campaign
export async function GET(
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

    const campaign = await prisma.campaign.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

// PATCH /api/campaigns/[id] - Update a campaign
export async function PATCH(
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
    const data = await request.json();

    // Verify campaign belongs to gym
    const existingCampaign = await prisma.campaign.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Don't allow editing sent campaigns
    if (existingCampaign.status === "SENT") {
      return NextResponse.json(
        { error: "Cannot edit a sent campaign" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        subject: data.subject,
        content: data.content,
        targetAudience: data.targetAudience,
        targetTagId: data.targetTagId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.status,
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete a campaign
export async function DELETE(
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

    // Verify campaign belongs to gym
    const existingCampaign = await prisma.campaign.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
