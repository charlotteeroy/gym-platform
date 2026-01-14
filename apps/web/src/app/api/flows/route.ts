import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@gym/database";
import { getSession, getStaffWithGym } from "@/lib/auth";

// GET /api/flows - List all automated flows for the gym
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

    const flows = await prisma.automatedFlow.findMany({
      where: { gymId: staff.gymId },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(flows);
  } catch (error) {
    console.error("Error fetching flows:", error);
    return NextResponse.json(
      { error: "Failed to fetch flows" },
      { status: 500 }
    );
  }
}

// POST /api/flows - Create a new automated flow
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
    const { name, description, triggerType, triggerValue, isActive, steps } = data;

    const flow = await prisma.automatedFlow.create({
      data: {
        name,
        description,
        triggerType,
        triggerValue,
        isActive: isActive ?? false,
        gymId: staff.gymId,
        steps: {
          create: steps?.map((step: any, index: number) => ({
            order: index,
            actionType: step.actionType,
            channel: step.channel,
            subject: step.subject,
            content: step.content,
            waitDays: step.waitDays,
            tagId: step.tagId,
          })) ?? [],
        },
      },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(flow, { status: 201 });
  } catch (error) {
    console.error("Error creating flow:", error);
    return NextResponse.json(
      { error: "Failed to create flow" },
      { status: 500 }
    );
  }
}
