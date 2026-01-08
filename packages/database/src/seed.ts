import { PrismaClient, StaffRole, BillingInterval, MemberStatus, SubscriptionStatus, CheckInMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to create random dates
function randomDate(daysAgo: number, daysRange: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo + Math.floor(Math.random() * daysRange));
  date.setHours(Math.floor(Math.random() * 14) + 6, Math.floor(Math.random() * 60), 0, 0);
  return date;
}

// Sample member data
const sampleMembers = [
  { firstName: 'Alex', lastName: 'Member', email: 'member@testgym.com', status: 'active', activityLevel: 'high' },
  { firstName: 'Emma', lastName: 'Wilson', email: 'emma.wilson@email.com', status: 'active', activityLevel: 'high' },
  { firstName: 'James', lastName: 'Chen', email: 'james.chen@email.com', status: 'active', activityLevel: 'high' },
  { firstName: 'Sofia', lastName: 'Rodriguez', email: 'sofia.r@email.com', status: 'active', activityLevel: 'medium' },
  { firstName: 'Liam', lastName: 'O\'Brien', email: 'liam.obrien@email.com', status: 'active', activityLevel: 'medium' },
  { firstName: 'Olivia', lastName: 'Taylor', email: 'olivia.t@email.com', status: 'active', activityLevel: 'medium' },
  { firstName: 'Noah', lastName: 'Garcia', email: 'noah.garcia@email.com', status: 'active', activityLevel: 'low' },
  { firstName: 'Ava', lastName: 'Martinez', email: 'ava.martinez@email.com', status: 'active', activityLevel: 'low' },
  { firstName: 'Mason', lastName: 'Lee', email: 'mason.lee@email.com', status: 'active', activityLevel: 'dormant' },
  { firstName: 'Isabella', lastName: 'Kim', email: 'isabella.kim@email.com', status: 'active', activityLevel: 'dormant' },
  { firstName: 'Ethan', lastName: 'Brown', email: 'ethan.brown@email.com', status: 'active', activityLevel: 'dormant' },
  { firstName: 'Mia', lastName: 'Davis', email: 'mia.davis@email.com', status: 'active', activityLevel: 'at-risk' },
  { firstName: 'Lucas', lastName: 'Miller', email: 'lucas.miller@email.com', status: 'active', activityLevel: 'at-risk' },
  { firstName: 'Charlotte', lastName: 'Anderson', email: 'charlotte.a@email.com', status: 'active', activityLevel: 'at-risk' },
  { firstName: 'Benjamin', lastName: 'Thomas', email: 'ben.thomas@email.com', status: 'cancelled', activityLevel: 'none' },
  { firstName: 'Amelia', lastName: 'Jackson', email: 'amelia.j@email.com', status: 'cancelled', activityLevel: 'none' },
  { firstName: 'Henry', lastName: 'White', email: 'henry.white@email.com', status: 'cancelled', activityLevel: 'none' },
  { firstName: 'Harper', lastName: 'Harris', email: 'harper.h@email.com', status: 'active', activityLevel: 'high' },
  { firstName: 'Sebastian', lastName: 'Martin', email: 'seb.martin@email.com', status: 'active', activityLevel: 'medium' },
  { firstName: 'Evelyn', lastName: 'Thompson', email: 'evelyn.t@email.com', status: 'active', activityLevel: 'low' },
  { firstName: 'Jack', lastName: 'Moore', email: 'jack.moore@email.com', status: 'active', activityLevel: 'high' },
  { firstName: 'Luna', lastName: 'Clark', email: 'luna.clark@email.com', status: 'active', activityLevel: 'medium' },
  { firstName: 'Owen', lastName: 'Lewis', email: 'owen.lewis@email.com', status: 'active', activityLevel: 'at-risk' },
  { firstName: 'Aria', lastName: 'Walker', email: 'aria.walker@email.com', status: 'paused', activityLevel: 'none' },
  { firstName: 'William', lastName: 'Hall', email: 'william.hall@email.com', status: 'paused', activityLevel: 'none' },
];

async function main() {
  console.log('Seeding database with realistic demo data...');

  // Clear existing data (in correct order due to foreign keys)
  await prisma.booking.deleteMany({});
  await prisma.checkIn.deleteMany({});
  await prisma.classSession.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.membershipPlan.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.gym.deleteMany({});

  // Create test gym
  const gym = await prisma.gym.create({
    data: {
      name: 'FitLife Gym',
      slug: 'fitlife-gym',
      email: 'info@fitlifegym.com',
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
  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@testgym.com',
      passwordHash: ownerPasswordHash,
    },
  });

  const owner = await prisma.staff.create({
    data: {
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

  // ========== INSTRUCTORS ==========
  const instructorNames = [
    { first: 'Mike', last: 'Trainer', email: 'mike@fitlifegym.com' },
    { first: 'Jessica', last: 'Yoga', email: 'jessica@fitlifegym.com' },
    { first: 'Carlos', last: 'Spin', email: 'carlos@fitlifegym.com' },
  ];

  const instructors = [];
  for (const inst of instructorNames) {
    const user = await prisma.user.create({
      data: {
        email: inst.email,
        passwordHash: ownerPasswordHash,
      },
    });
    const instructor = await prisma.staff.create({
      data: {
        firstName: inst.first,
        lastName: inst.last,
        email: inst.email,
        phone: '(555) 333-4444',
        role: StaffRole.INSTRUCTOR,
        userId: user.id,
        gymId: gym.id,
      },
    });
    instructors.push(instructor);
  }

  console.log('Created', instructors.length, 'instructors');

  // ========== MEMBERSHIP PLANS ==========
  const basicPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Basic',
      description: 'Access to gym floor and basic equipment',
      priceAmount: 29.99,
      billingInterval: BillingInterval.MONTHLY,
      classCredits: 4,
      features: ['Gym floor access', 'Locker room access', '4 classes per month'],
      gymId: gym.id,
    },
  });

  const premiumPlan = await prisma.membershipPlan.create({
    data: {
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

  const annualPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Annual Premium',
      description: 'Best value - all premium benefits with 2 months free',
      priceAmount: 799.99,
      billingInterval: BillingInterval.YEARLY,
      classCredits: -1,
      guestPasses: 4,
      features: [
        'Everything in Premium',
        '2 months free',
        '4 guest passes per month',
        'Priority class booking',
        'Free nutrition consultation',
      ],
      gymId: gym.id,
    },
  });

  const plans = [basicPlan, premiumPlan, annualPlan];
  console.log('Created membership plans:', plans.map(p => p.name).join(', '));

  // ========== CLASSES ==========
  const classDefinitions = [
    { name: 'Morning Yoga', description: 'Start your day with a relaxing yoga session', color: '#10b981', capacity: 20, duration: 60, instructorIdx: 1 },
    { name: 'Power Yoga', description: 'More intense yoga for building strength', color: '#059669', capacity: 15, duration: 75, instructorIdx: 1 },
    { name: 'HIIT Training', description: 'High-intensity interval training for maximum results', color: '#ef4444', capacity: 15, duration: 45, instructorIdx: 0 },
    { name: 'Spin Class', description: 'High-energy cycling workout with pumping music', color: '#f59e0b', capacity: 25, duration: 45, instructorIdx: 2 },
    { name: 'Strength Training', description: 'Build muscle with weights and resistance training', color: '#8b5cf6', capacity: 12, duration: 50, instructorIdx: 0 },
    { name: 'Pilates', description: 'Core-focused exercises for strength and flexibility', color: '#ec4899', capacity: 18, duration: 55, instructorIdx: 1 },
    { name: 'Boxing Fitness', description: 'Boxing-inspired cardio workout', color: '#1f2937', capacity: 16, duration: 60, instructorIdx: 0 },
    { name: 'Zumba', description: 'Dance your way to fitness with Latin rhythms', color: '#06b6d4', capacity: 30, duration: 60, instructorIdx: 2 },
  ];

  const classes = [];
  for (const cls of classDefinitions) {
    const created = await prisma.class.create({
      data: {
        name: cls.name,
        description: cls.description,
        color: cls.color,
        capacity: cls.capacity,
        durationMinutes: cls.duration,
        instructorId: instructors[cls.instructorIdx].id,
        gymId: gym.id,
      },
    });
    classes.push(created);
  }

  console.log('Created', classes.length, 'class types');

  // ========== CLASS SESSIONS (past 30 days + next 14 days) ==========
  const sessions = [];
  const now = new Date();

  // Schedule structure - which classes on which days/times
  const weekSchedule = [
    { dayOffset: 0, classes: [{ idx: 0, hour: 7 }, { idx: 2, hour: 9 }, { idx: 3, hour: 12 }, { idx: 4, hour: 17 }, { idx: 6, hour: 18 }] }, // Mon
    { dayOffset: 1, classes: [{ idx: 1, hour: 7 }, { idx: 5, hour: 9 }, { idx: 3, hour: 12 }, { idx: 7, hour: 18 }] }, // Tue
    { dayOffset: 2, classes: [{ idx: 0, hour: 7 }, { idx: 2, hour: 9 }, { idx: 4, hour: 12 }, { idx: 3, hour: 17 }, { idx: 6, hour: 18 }] }, // Wed
    { dayOffset: 3, classes: [{ idx: 1, hour: 7 }, { idx: 5, hour: 9 }, { idx: 7, hour: 12 }, { idx: 2, hour: 18 }] }, // Thu
    { dayOffset: 4, classes: [{ idx: 0, hour: 7 }, { idx: 2, hour: 9 }, { idx: 3, hour: 12 }, { idx: 4, hour: 17 }] }, // Fri
    { dayOffset: 5, classes: [{ idx: 0, hour: 9 }, { idx: 7, hour: 10 }, { idx: 3, hour: 11 }] }, // Sat
    { dayOffset: 6, classes: [{ idx: 1, hour: 10 }, { idx: 5, hour: 11 }] }, // Sun
  ];

  // Create sessions for past 30 days and next 14 days
  for (let dayOffset = -30; dayOffset <= 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dayOfWeek = date.getDay();
    const schedule = weekSchedule[dayOfWeek === 0 ? 6 : dayOfWeek - 1]; // Adjust for Sunday

    for (const slot of schedule.classes) {
      const startTime = new Date(date);
      startTime.setHours(slot.hour, 0, 0, 0);
      const cls = classes[slot.idx];
      const endTime = new Date(startTime.getTime() + cls.durationMinutes * 60 * 1000);

      sessions.push({
        classId: cls.id,
        startTime,
        endTime,
        gymId: gym.id,
        status: dayOffset < 0 ? 'COMPLETED' : 'SCHEDULED',
      });
    }
  }

  await prisma.classSession.createMany({ data: sessions });
  console.log('Created', sessions.length, 'class sessions');

  // ========== MEMBERS ==========
  const members = [];
  for (let i = 0; i < sampleMembers.length; i++) {
    const m = sampleMembers[i];
    const isTestMember = m.email === 'member@testgym.com';

    let user;
    if (isTestMember) {
      user = await prisma.user.create({
        data: {
          email: m.email,
          passwordHash: memberPasswordHash,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: m.email,
          passwordHash: memberPasswordHash,
        },
      });
    }

    const memberStatus = m.status === 'cancelled' ? MemberStatus.CANCELLED :
                         m.status === 'paused' ? MemberStatus.PAUSED : MemberStatus.ACTIVE;

    const joinedDaysAgo = Math.floor(Math.random() * 180) + 30; // Joined 30-210 days ago

    const member = await prisma.member.create({
      data: {
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        status: memberStatus,
        userId: user.id,
        gymId: gym.id,
        createdAt: randomDate(joinedDaysAgo),
      },
    });

    // Create subscription based on status and activity
    let subscriptionStatus = SubscriptionStatus.ACTIVE;
    let cancelAtPeriodEnd = false;
    let cancelledAt = null;

    if (m.status === 'cancelled') {
      subscriptionStatus = SubscriptionStatus.CANCELLED;
      cancelledAt = randomDate(Math.floor(Math.random() * 14) + 1); // Cancelled 1-14 days ago
    } else if (m.status === 'paused') {
      subscriptionStatus = SubscriptionStatus.PAUSED;
    } else if (m.activityLevel === 'at-risk') {
      cancelAtPeriodEnd = true; // Set to cancel
    }

    // Assign plan - mix of plans
    const planIndex = i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0);
    const plan = plans[planIndex];

    await prisma.subscription.create({
      data: {
        memberId: member.id,
        planId: plan.id,
        status: subscriptionStatus,
        currentPeriodStart: randomDate(25, 5),
        currentPeriodEnd: new Date(Date.now() + (Math.random() * 20 + 5) * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd,
        cancelledAt,
      },
    });

    members.push({ ...member, activityLevel: m.activityLevel });
  }

  console.log('Created', members.length, 'members with subscriptions');

  // ========== CHECK-INS ==========
  const allSessions = await prisma.classSession.findMany({
    where: { gymId: gym.id },
    include: { class: true },
  });

  const pastSessions = allSessions.filter(s => new Date(s.startTime) < now);
  let checkInCount = 0;
  let bookingCount = 0;

  for (const member of members) {
    let checkInsToCreate = 0;
    let checkInRecency = 0; // Days since last check-in

    switch (member.activityLevel) {
      case 'high':
        checkInsToCreate = Math.floor(Math.random() * 15) + 20; // 20-35 check-ins
        checkInRecency = Math.floor(Math.random() * 3); // 0-2 days ago
        break;
      case 'medium':
        checkInsToCreate = Math.floor(Math.random() * 10) + 8; // 8-18 check-ins
        checkInRecency = Math.floor(Math.random() * 7) + 1; // 1-7 days ago
        break;
      case 'low':
        checkInsToCreate = Math.floor(Math.random() * 5) + 3; // 3-8 check-ins
        checkInRecency = Math.floor(Math.random() * 14) + 7; // 7-21 days ago
        break;
      case 'dormant':
        checkInsToCreate = Math.floor(Math.random() * 3) + 1; // 1-3 check-ins
        checkInRecency = Math.floor(Math.random() * 30) + 30; // 30-60 days ago
        break;
      case 'at-risk':
        checkInsToCreate = Math.floor(Math.random() * 6) + 4; // 4-10 check-ins
        checkInRecency = Math.floor(Math.random() * 14) + 14; // 14-28 days ago
        break;
      default:
        checkInsToCreate = 0;
    }

    // Create check-ins
    for (let i = 0; i < checkInsToCreate; i++) {
      const daysAgo = i === 0 ? checkInRecency : checkInRecency + Math.floor(Math.random() * 25) + i * 2;
      if (daysAgo > 60) continue;

      const methods = [CheckInMethod.QR_CODE, CheckInMethod.CARD_SCAN, CheckInMethod.MANUAL];
      await prisma.checkIn.create({
        data: {
          memberId: member.id,
          gymId: gym.id,
          checkedInAt: randomDate(daysAgo),
          method: methods[Math.floor(Math.random() * methods.length)],
        },
      });
      checkInCount++;
    }

    // Create class bookings for active members
    if (member.activityLevel !== 'none' && member.activityLevel !== 'dormant') {
      const numBookings = member.activityLevel === 'high' ? Math.floor(Math.random() * 8) + 5 :
                          member.activityLevel === 'medium' ? Math.floor(Math.random() * 5) + 2 :
                          Math.floor(Math.random() * 3) + 1;

      const shuffledSessions = [...pastSessions].sort(() => Math.random() - 0.5).slice(0, numBookings);

      for (const session of shuffledSessions) {
        try {
          await prisma.booking.create({
            data: {
              memberId: member.id,
              sessionId: session.id,
              status: 'CONFIRMED',
              createdAt: new Date(new Date(session.startTime).getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            },
          });
          bookingCount++;
        } catch (e) {
          // Skip duplicate bookings
        }
      }
    }
  }

  console.log('Created', checkInCount, 'check-ins');
  console.log('Created', bookingCount, 'class bookings');

  // ========== FUTURE BOOKINGS ==========
  const futureSessions = allSessions.filter(s => new Date(s.startTime) > now);
  const activeMembers = members.filter(m => m.activityLevel === 'high' || m.activityLevel === 'medium');

  for (const session of futureSessions.slice(0, 30)) {
    const numBookings = Math.floor(Math.random() * Math.min(8, activeMembers.length));
    const shuffledMembers = [...activeMembers].sort(() => Math.random() - 0.5).slice(0, numBookings);

    for (const member of shuffledMembers) {
      try {
        await prisma.booking.create({
          data: {
            memberId: member.id,
            sessionId: session.id,
            status: 'CONFIRMED',
          },
        });
      } catch (e) {
        // Skip duplicates
      }
    }
  }

  console.log('Added future class bookings');

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
  console.log('DEMO DATA SUMMARY:');
  console.log('  - 25 members with varied activity patterns');
  console.log('  - 3 cancelled, 2 paused, 4 at-risk subscriptions');
  console.log('  - 8 different class types');
  console.log('  - Class sessions for past 30 days + next 14 days');
  console.log('  - Check-ins and bookings based on activity level');
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
