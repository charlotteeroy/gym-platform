import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@gym/database";
import { getSession, getStaffWithGym } from "@/lib/auth";

// GET /api/flows/[id] - Get a specific flow
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

    const flow = await prisma.automatedFlow.findFirst({
      where: { id, gymId: staff.gymId },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    return NextResponse.json(flow);
  } catch (error) {
    console.error("Error fetching flow:", error);
    return NextResponse.json(
      { error: "Failed to fetch flow" },
      { status: 500 }
    );
  }
}

// PATCH /api/flows/[id] - Update a flow
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
    const { name, description, triggerType, triggerValue, isActive, steps } = data;

    // Verify flow belongs to gym
    const existingFlow = await prisma.automatedFlow.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingFlow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    // Update flow and replace steps
    const flow = await prisma.$transaction(async (tx) => {
      // Delete existing steps if new steps provided
      if (steps) {
        await tx.flowStep.deleteMany({
          where: { flowId: id },
        });
      }

      return tx.automatedFlow.update({
        where: { id },
        data: {
          name,
          description,
          triggerType,
          triggerValue,
          isActive,
          steps: steps
            ? {
                create: steps.map((step: any, index: number) => ({
                  order: index,
                  actionType: step.actionType,
                  channel: step.channel,
                  subject: step.subject,
                  content: step.content,
                  waitDays: step.waitDays,
                  tagId: step.tagId,
                })),
              }
            : undefined,
        },
        include: {
          steps: {
            orderBy: { order: "asc" },
          },
        },
      });
    });

    return NextResponse.json(flow);
  } catch (error) {
    console.error("Error updating flow:", error);
    return NextResponse.json(
      { error: "Failed to update flow" },
      { status: 500 }
    );
  }
}

// DELETE /api/flows/[id] - Delete a flow
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

    // Verify flow belongs to gym
    const existingFlow = await prisma.automatedFlow.findFirst({
      where: { id, gymId: staff.gymId },
    });

    if (!existingFlow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    await prisma.automatedFlow.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting flow:", error);
    return NextResponse.json(
      { error: "Failed to delete flow" },
      { status: 500 }
    );
  }
}
