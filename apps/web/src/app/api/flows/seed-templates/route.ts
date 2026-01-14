import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@gym/database";
import { getSession, getStaffWithGym } from "@/lib/auth";

const DEFAULT_TEMPLATES = [
  {
    name: "Win-Back Inactive Members",
    description: "Re-engage members who haven't visited in 14 days",
    triggerType: "NO_CHECKIN" as const,
    triggerValue: 14,
    isTemplate: true,
    steps: [
      {
        order: 0,
        actionType: "SEND_EMAIL" as const,
        channel: "EMAIL" as const,
        subject: "We miss you at {{gym_name}}!",
        content:
          "Hi {{first_name}},\n\nWe noticed you haven't visited us in a while. We miss seeing you at the gym!\n\nCome back and get back on track with your fitness goals. Your workout routine is waiting for you.\n\nSee you soon!\n{{gym_name}} Team",
      },
      {
        order: 1,
        actionType: "WAIT" as const,
        waitDays: 3,
      },
      {
        order: 2,
        actionType: "SEND_SMS" as const,
        channel: "SMS" as const,
        content:
          "Hey {{first_name}}! We miss you at {{gym_name}}. Come back this week and let's crush those goals together!",
      },
    ],
  },
  {
    name: "New Member Welcome",
    description: "Welcome new members and help them get started",
    triggerType: "NEW_SIGNUP" as const,
    triggerValue: null,
    isTemplate: true,
    steps: [
      {
        order: 0,
        actionType: "SEND_EMAIL" as const,
        channel: "EMAIL" as const,
        subject: "Welcome to {{gym_name}}!",
        content:
          "Hi {{first_name}},\n\nWelcome to the {{gym_name}} family! We're thrilled to have you with us.\n\nHere are a few tips to get started:\n- Download our app to book classes\n- Check out our class schedule\n- Don't hesitate to ask our staff for help\n\nWe can't wait to see you at the gym!\n\nBest,\n{{gym_name}} Team",
      },
      {
        order: 1,
        actionType: "WAIT" as const,
        waitDays: 2,
      },
      {
        order: 2,
        actionType: "SEND_EMAIL" as const,
        channel: "EMAIL" as const,
        subject: "How's your first week going?",
        content:
          "Hi {{first_name}},\n\nHow's your first week at {{gym_name}} going?\n\nIf you have any questions or need help with equipment, our staff is always happy to assist.\n\nHave you tried any of our group classes yet? They're a great way to meet other members and stay motivated!\n\nKeep up the great work!\n{{gym_name}} Team",
      },
    ],
  },
  {
    name: "Membership Renewal Reminder",
    description: "Remind members before their membership expires",
    triggerType: "MEMBERSHIP_EXPIRING" as const,
    triggerValue: 14,
    isTemplate: true,
    steps: [
      {
        order: 0,
        actionType: "SEND_EMAIL" as const,
        channel: "EMAIL" as const,
        subject: "Your membership is expiring soon",
        content:
          "Hi {{first_name}},\n\nJust a friendly reminder that your {{gym_name}} membership will expire in 14 days.\n\nDon't let your fitness journey stop! Renew now to keep access to all our facilities and classes.\n\nRenew your membership today and continue working toward your goals.\n\nBest,\n{{gym_name}} Team",
      },
      {
        order: 1,
        actionType: "WAIT" as const,
        waitDays: 7,
      },
      {
        order: 2,
        actionType: "SEND_EMAIL" as const,
        channel: "EMAIL" as const,
        subject: "Only 7 days left on your membership",
        content:
          "Hi {{first_name}},\n\nYour membership expires in just 7 days!\n\nRenew now to avoid any interruption to your workouts. We'd hate to see you go.\n\nNeed help renewing? Just reply to this email or visit our front desk.\n\n{{gym_name}} Team",
      },
      {
        order: 3,
        actionType: "WAIT" as const,
        waitDays: 5,
      },
      {
        order: 4,
        actionType: "SEND_SMS" as const,
        channel: "SMS" as const,
        content:
          "Hi {{first_name}}, your {{gym_name}} membership expires in 2 days! Renew today to keep your access.",
      },
    ],
  },
  {
    name: "Birthday Reward",
    description: "Send birthday wishes with a special offer",
    triggerType: "BIRTHDAY" as const,
    triggerValue: null,
    isTemplate: true,
    steps: [
      {
        order: 0,
        actionType: "SEND_EMAIL" as const,
        channel: "EMAIL" as const,
        subject: "Happy Birthday, {{first_name}}!",
        content:
          "Happy Birthday, {{first_name}}!\n\nThe whole team at {{gym_name}} wishes you an amazing birthday!\n\nAs our gift to you, enjoy a FREE guest pass to bring a friend to your next workout. Just show this email at the front desk.\n\nHere's to another year of crushing your fitness goals!\n\nHave a wonderful day!\n{{gym_name}} Team",
      },
      {
        order: 1,
        actionType: "SEND_SMS" as const,
        channel: "SMS" as const,
        content:
          "Happy Birthday {{first_name}}! Enjoy a FREE guest pass this week courtesy of {{gym_name}}. Show this text at the front desk!",
      },
    ],
  },
];

// POST /api/flows/seed-templates - Create default templates for a gym
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

    // Check if templates already exist
    const existingTemplates = await prisma.automatedFlow.count({
      where: {
        gymId: staff.gymId,
        isTemplate: true,
      },
    });

    if (existingTemplates > 0) {
      return NextResponse.json(
        { message: "Templates already exist", count: existingTemplates },
        { status: 200 }
      );
    }

    // Create all templates
    const createdFlows = [];
    for (const template of DEFAULT_TEMPLATES) {
      const flow = await prisma.automatedFlow.create({
        data: {
          name: template.name,
          description: template.description,
          triggerType: template.triggerType,
          triggerValue: template.triggerValue,
          isTemplate: template.isTemplate,
          isActive: false,
          gymId: staff.gymId,
          steps: {
            create: template.steps.map((step) => ({
              order: step.order,
              actionType: step.actionType,
              channel: "channel" in step ? step.channel : null,
              subject: "subject" in step ? step.subject : null,
              content: "content" in step ? step.content : null,
              waitDays: "waitDays" in step ? step.waitDays : null,
              tagId: null,
            })),
          },
        },
        include: {
          steps: true,
        },
      });
      createdFlows.push(flow);
    }

    return NextResponse.json(createdFlows, { status: 201 });
  } catch (error) {
    console.error("Error seeding templates:", error);
    return NextResponse.json(
      { error: "Failed to seed templates" },
      { status: 500 }
    );
  }
}
