import { PrismaClient, StaffRole, BillingInterval, MemberStatus, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test gym
  const gym = await prisma.gym.upsert({
    where: { slug: 'test-gym' },
    update: {},
    create: {
      name: 'Test Gym',
      slug: 'test-gym',
      email: 'info@testgym.com',
      phone: '(555) 123-4567',
      address: '123 Fitness Street, Gym City, GC 12345',
      timezone: 'America/New_York',
      currency: 'USD',
    },
  });

  console.log('Created gym:', gym.name);

  // Hash passwords
  const ownerPasswordHash = await bcrypt.hash('TestOwner123!', 12);
  const memberPasswordHash = await bcrypt.hash('TestMember123!', 12);

  // ========== GYM OWNER ==========
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@testgym.com' },
    update: { passwordHash: ownerPasswordHash },
    create: {
      email: 'owner@testgym.com',
      passwordHash: ownerPasswordHash,
    },
  });

  const owner = await prisma.staff.upsert({
    where: { userId: ownerUser.id },
    update: {},
    create: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'owner@testgym.com',
      phone: '(555) 111-2222',
      role: StaffRole.OWNER,
      userId: ownerUser.id,
      gymId: gym.id,
    },
  });

  console.log('Created owner:', owner.firstName, owner.lastName);

  // ========== INSTRUCTOR ==========
  const instructorUser = await prisma.user.upsert({
    where: { email: 'instructor@testgym.com' },
    update: {},
    create: {
      email: 'instructor@testgym.com',
      passwordHash: ownerPasswordHash,
    },
  });

  const instructor = await prisma.staff.upsert({
    where: { userId: instructorUser.id },
    update: {},
    create: {
      firstName: 'Mike',
      lastName: 'Trainer',
      email: 'instructor@testgym.com',
      phone: '(555) 333-4444',
      role: StaffRole.INSTRUCTOR,
      userId: instructorUser.id,
      gymId: gym.id,
    },
  });

  console.log('Created instructor:', instructor.firstName, instructor.lastName);

  // ========== MEMBERSHIP PLANS ==========
  const basicPlan = await prisma.membershipPlan.upsert({
    where: { id: 'basic-plan' },
    update: {},
    create: {
      id: 'basic-plan',
      name: 'Basic',
      description: 'Access to gym floor and basic equipment',
      priceAmount: 29.99,
      billingInterval: BillingInterval.MONTHLY,
      classCredits: 4,
      features: ['Gym floor access', 'Locker room access', '4 classes per month'],
      gymId: gym.id,
    },
  });

  const premiumPlan = await prisma.membershipPlan.upsert({
    where: { id: 'premium-plan' },
    update: {},
    create: {
      id: 'premium-plan',
      name: 'Premium',
      description: 'Unlimited access to all facilities and classes',
      priceAmount: 79.99,
      billingInterval: BillingInterval.MONTHLY,
      classCredits: -1,
      guestPasses: 2,
      features: [
        'Unlimited gym access',
        'Unlimited classes',
        'Personal training discount',
        '2 guest passes per month',
        'Towel service',
      ],
      gymId: gym.id,
    },
  });

  console.log('Created membership plans:', basicPlan.name, premiumPlan.name);

  // ========== GYM MEMBER ==========
  const memberUser = await prisma.user.upsert({
    where: { email: 'member@testgym.com' },
    update: { passwordHash: memberPasswordHash },
    create: {
      email: 'member@testgym.com',
      passwordHash: memberPasswordHash,
    },
  });

  const member = await prisma.member.upsert({
    where: { id: 'test-member' },
    update: {},
    create: {
      id: 'test-member',
      firstName: 'Alex',
      lastName: 'Member',
      email: 'member@testgym.com',
      phone: '(555) 555-6666',
      status: MemberStatus.ACTIVE,
      userId: memberUser.id,
      gymId: gym.id,
    },
  });

  // Create subscription for member
  const subscription = await prisma.subscription.upsert({
    where: { memberId: member.id },
    update: {},
    create: {
      memberId: member.id,
      planId: premiumPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('Created member:', member.firstName, member.lastName, '- Plan:', premiumPlan.name);

  // ========== CLASSES ==========
  const yogaClass = await prisma.class.upsert({
    where: { id: 'yoga-class' },
    update: {},
    create: {
      id: 'yoga-class',
      name: 'Morning Yoga',
      description: 'Start your day with a relaxing yoga session. Perfect for all skill levels.',
      color: '#10b981',
      capacity: 20,
      durationMinutes: 60,
      instructorId: instructor.id,
      gymId: gym.id,
    },
  });

  const hiitClass = await prisma.class.upsert({
    where: { id: 'hiit-class' },
    update: {},
    create: {
      id: 'hiit-class',
      name: 'HIIT Training',
      description: 'High-intensity interval training for maximum results. Burn calories fast!',
      color: '#ef4444',
      capacity: 15,
      durationMinutes: 45,
      instructorId: instructor.id,
      gymId: gym.id,
    },
  });

  const spinClass = await prisma.class.upsert({
    where: { id: 'spin-class' },
    update: {},
    create: {
      id: 'spin-class',
      name: 'Spin Class',
      description: 'High-energy cycling workout with pumping music.',
      color: '#f59e0b',
      capacity: 25,
      durationMinutes: 45,
      instructorId: instructor.id,
      gymId: gym.id,
    },
  });

  const strengthClass = await prisma.class.upsert({
    where: { id: 'strength-class' },
    update: {},
    create: {
      id: 'strength-class',
      name: 'Strength Training',
      description: 'Build muscle and increase strength with weights and resistance training.',
      color: '#8b5cf6',
      capacity: 12,
      durationMinutes: 50,
      instructorId: instructor.id,
      gymId: gym.id,
    },
  });

  console.log('Created classes:', yogaClass.name, hiitClass.name, spinClass.name, strengthClass.name);

  // ========== CLASS SESSIONS (upcoming week) ==========
  const now = new Date();
  const sessions = [];

  // Helper to create sessions for next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    // Morning Yoga - 7:00 AM
    const yogaTime = new Date(date);
    yogaTime.setHours(7, 0, 0, 0);
    sessions.push({
      classId: yogaClass.id,
      startTime: yogaTime,
      endTime: new Date(yogaTime.getTime() + 60 * 60 * 1000),
      gymId: gym.id,
    });

    // HIIT - 9:00 AM
    const hiitTime = new Date(date);
    hiitTime.setHours(9, 0, 0, 0);
    sessions.push({
      classId: hiitClass.id,
      startTime: hiitTime,
      endTime: new Date(hiitTime.getTime() + 45 * 60 * 1000),
      gymId: gym.id,
    });

    // Spin - 12:00 PM
    const spinTime = new Date(date);
    spinTime.setHours(12, 0, 0, 0);
    sessions.push({
      classId: spinClass.id,
      startTime: spinTime,
      endTime: new Date(spinTime.getTime() + 45 * 60 * 1000),
      gymId: gym.id,
    });

    // Strength - 5:30 PM
    const strengthTime = new Date(date);
    strengthTime.setHours(17, 30, 0, 0);
    sessions.push({
      classId: strengthClass.id,
      startTime: strengthTime,
      endTime: new Date(strengthTime.getTime() + 50 * 60 * 1000),
      gymId: gym.id,
    });
  }

  // Delete existing sessions and create new ones
  await prisma.classSession.deleteMany({ where: { gymId: gym.id } });
  await prisma.classSession.createMany({ data: sessions });

  console.log('Created', sessions.length, 'class sessions for the next 7 days');

  // ========== SAMPLE BOOKING ==========
  const firstSession = await prisma.classSession.findFirst({
    where: { gymId: gym.id },
    orderBy: { startTime: 'asc' },
  });

  if (firstSession) {
    await prisma.booking.upsert({
      where: {
        memberId_sessionId: {
          memberId: member.id,
          sessionId: firstSession.id,
        },
      },
      update: {},
      create: {
        memberId: member.id,
        sessionId: firstSession.id,
      },
    });
    console.log('Created sample booking for first class session');
  }

  console.log('');
  console.log('========================================');
  console.log('           SEEDING COMPLETED           ');
  console.log('========================================');
  console.log('');
  console.log('GYM OWNER LOGIN:');
  console.log('  Email:    owner@testgym.com');
  console.log('  Password: TestOwner123!');
  console.log('  URL:      http://localhost:3000/login');
  console.log('');
  console.log('GYM MEMBER LOGIN:');
  console.log('  Email:    member@testgym.com');
  console.log('  Password: TestMember123!');
  console.log('  URL:      http://localhost:3000/member-login');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
