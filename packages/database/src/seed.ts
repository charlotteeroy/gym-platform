import { PrismaClient, StaffRole, BillingInterval, MemberStatus, SubscriptionStatus, CheckInMethod, PaymentStatus, PaymentMethod, InvoiceStatus, ExpenseCategory, PayoutStatus } from '@prisma/client';
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
  await prisma.invoiceItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.payout.deleteMany({});
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

  // ========== BILLING DATA ==========

  // ===== PAYMENTS =====
  const paymentData = [
    { amount: 79.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Premium Monthly - January', daysAgo: 2 },
    { amount: 79.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Premium Monthly - January', daysAgo: 3 },
    { amount: 29.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Basic Monthly - January', daysAgo: 4 },
    { amount: 799.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Annual Premium', daysAgo: 5 },
    { amount: 79.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Premium Monthly - January', daysAgo: 6 },
    { amount: 29.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CASH, description: 'Basic Monthly - January', daysAgo: 7 },
    { amount: 150.00, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Personal Training Session (3x)', daysAgo: 8 },
    { amount: 79.99, status: PaymentStatus.PENDING, method: PaymentMethod.CARD, description: 'Premium Monthly - Processing', daysAgo: 0 },
    { amount: 29.99, status: PaymentStatus.FAILED, method: PaymentMethod.CARD, description: 'Basic Monthly - Card Declined', daysAgo: 1 },
    { amount: 79.99, status: PaymentStatus.REFUNDED, method: PaymentMethod.CARD, description: 'Premium Monthly - Refunded', daysAgo: 10 },
    { amount: 29.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.BANK_TRANSFER, description: 'Basic Monthly - December', daysAgo: 32 },
    { amount: 79.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Premium Monthly - December', daysAgo: 33 },
    { amount: 79.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Premium Monthly - December', daysAgo: 34 },
    { amount: 29.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Basic Monthly - December', daysAgo: 35 },
    { amount: 799.99, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Annual Premium', daysAgo: 40 },
    { amount: 50.00, status: PaymentStatus.COMPLETED, method: PaymentMethod.CASH, description: 'Guest Pass (5x)', daysAgo: 12 },
    { amount: 25.00, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Merchandise - Water Bottle', daysAgo: 15 },
    { amount: 45.00, status: PaymentStatus.COMPLETED, method: PaymentMethod.CARD, description: 'Merchandise - Gym Shirt', daysAgo: 18 },
  ];

  for (const p of paymentData) {
    const randomMember = members[Math.floor(Math.random() * members.length)];
    await prisma.payment.create({
      data: {
        amount: p.amount,
        status: p.status,
        method: p.method,
        description: p.description,
        memberId: randomMember.id,
        gymId: gym.id,
        createdAt: randomDate(p.daysAgo),
      },
    });
  }

  console.log('Created', paymentData.length, 'payments');

  // ===== INVOICES =====
  const invoiceData = [
    { number: 'INV-2024-001', status: InvoiceStatus.PAID, subtotal: 79.99, daysAgo: 30, items: [{ desc: 'Premium Monthly Membership', qty: 1, price: 79.99 }] },
    { number: 'INV-2024-002', status: InvoiceStatus.PAID, subtotal: 159.98, daysAgo: 28, items: [{ desc: 'Premium Monthly Membership', qty: 1, price: 79.99 }, { desc: 'Personal Training (1 session)', qty: 1, price: 79.99 }] },
    { number: 'INV-2024-003', status: InvoiceStatus.PAID, subtotal: 29.99, daysAgo: 25, items: [{ desc: 'Basic Monthly Membership', qty: 1, price: 29.99 }] },
    { number: 'INV-2024-004', status: InvoiceStatus.SENT, subtotal: 79.99, daysAgo: 5, items: [{ desc: 'Premium Monthly Membership', qty: 1, price: 79.99 }] },
    { number: 'INV-2024-005', status: InvoiceStatus.SENT, subtotal: 29.99, daysAgo: 3, items: [{ desc: 'Basic Monthly Membership', qty: 1, price: 29.99 }] },
    { number: 'INV-2024-006', status: InvoiceStatus.OVERDUE, subtotal: 79.99, daysAgo: 45, items: [{ desc: 'Premium Monthly Membership', qty: 1, price: 79.99 }] },
    { number: 'INV-2024-007', status: InvoiceStatus.OVERDUE, subtotal: 109.98, daysAgo: 40, items: [{ desc: 'Basic Monthly Membership', qty: 1, price: 29.99 }, { desc: 'Late Fee', qty: 1, price: 80.00 }] },
    { number: 'INV-2024-008', status: InvoiceStatus.DRAFT, subtotal: 799.99, daysAgo: 1, items: [{ desc: 'Annual Premium Membership', qty: 1, price: 799.99 }] },
    { number: 'INV-2024-009', status: InvoiceStatus.CANCELLED, subtotal: 79.99, daysAgo: 20, items: [{ desc: 'Premium Monthly Membership', qty: 1, price: 79.99 }] },
    { number: 'INV-2024-010', status: InvoiceStatus.PAID, subtotal: 239.97, daysAgo: 15, items: [{ desc: 'Personal Training Package (3 sessions)', qty: 3, price: 79.99 }] },
  ];

  for (const inv of invoiceData) {
    const randomMember = members[Math.floor(Math.random() * members.length)];
    const tax = Math.round(inv.subtotal * 0.08 * 100) / 100; // 8% tax
    const total = Math.round((inv.subtotal + tax) * 100) / 100;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - inv.daysAgo + 30);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: inv.number,
        status: inv.status,
        subtotal: inv.subtotal,
        tax: tax,
        total: total,
        dueDate: dueDate,
        memberId: randomMember.id,
        gymId: gym.id,
        createdAt: randomDate(inv.daysAgo),
      },
    });

    // Create invoice items
    for (const item of inv.items) {
      await prisma.invoiceItem.create({
        data: {
          description: item.desc,
          quantity: item.qty,
          unitPrice: item.price,
          total: item.qty * item.price,
          invoiceId: invoice.id,
        },
      });
    }
  }

  console.log('Created', invoiceData.length, 'invoices with items');

  // ===== EXPENSES =====
  const expenseData = [
    // Operating expenses
    { amount: 3500.00, category: ExpenseCategory.RENT, description: 'Monthly Rent - January', vendor: 'Commercial Properties LLC', daysAgo: 5 },
    { amount: 3500.00, category: ExpenseCategory.RENT, description: 'Monthly Rent - December', vendor: 'Commercial Properties LLC', daysAgo: 35 },
    { amount: 450.00, category: ExpenseCategory.UTILITIES, description: 'Electricity - January', vendor: 'City Power Co', daysAgo: 8 },
    { amount: 125.00, category: ExpenseCategory.UTILITIES, description: 'Water - January', vendor: 'Water District', daysAgo: 10 },
    { amount: 89.99, category: ExpenseCategory.UTILITIES, description: 'Internet - January', vendor: 'FastNet ISP', daysAgo: 7 },
    { amount: 380.00, category: ExpenseCategory.UTILITIES, description: 'Electricity - December', vendor: 'City Power Co', daysAgo: 38 },
    { amount: 2500.00, category: ExpenseCategory.EQUIPMENT, description: 'New Treadmill', vendor: 'FitEquip Pro', daysAgo: 20 },
    { amount: 850.00, category: ExpenseCategory.EQUIPMENT, description: 'Dumbbell Set (5-50 lbs)', vendor: 'Iron Works', daysAgo: 45 },
    { amount: 320.00, category: ExpenseCategory.EQUIPMENT, description: 'Yoga Mats (20x)', vendor: 'Yoga Supplies Inc', daysAgo: 30 },
    { amount: 175.00, category: ExpenseCategory.MAINTENANCE, description: 'HVAC Filter Replacement', vendor: 'Cool Air Services', daysAgo: 15 },
    { amount: 450.00, category: ExpenseCategory.MAINTENANCE, description: 'Treadmill Repair', vendor: 'FitEquip Pro', daysAgo: 25 },
    { amount: 85.00, category: ExpenseCategory.MAINTENANCE, description: 'Deep Cleaning Service', vendor: 'CleanPro', daysAgo: 12 },
    // Marketing expenses
    { amount: 500.00, category: ExpenseCategory.MARKETING, description: 'Facebook/Instagram Ads - January', vendor: 'Meta Platforms', daysAgo: 3 },
    { amount: 250.00, category: ExpenseCategory.MARKETING, description: 'Google Ads - January', vendor: 'Google Ads', daysAgo: 5 },
    { amount: 150.00, category: ExpenseCategory.MARKETING, description: 'Flyers & Posters Printing', vendor: 'PrintShop Local', daysAgo: 18 },
    { amount: 75.00, category: ExpenseCategory.MARKETING, description: 'Email Marketing Tool', vendor: 'Mailchimp', daysAgo: 2 },
    // Payroll expenses
    { amount: 4500.00, category: ExpenseCategory.PAYROLL, description: 'Staff Wages - January Week 1', vendor: 'Payroll', daysAgo: 7 },
    { amount: 4500.00, category: ExpenseCategory.PAYROLL, description: 'Staff Wages - January Week 2', vendor: 'Payroll', daysAgo: 14 },
    { amount: 4500.00, category: ExpenseCategory.PAYROLL, description: 'Staff Wages - December Week 4', vendor: 'Payroll', daysAgo: 21 },
    { amount: 1200.00, category: ExpenseCategory.PAYROLL, description: 'Contractor - Personal Trainer', vendor: 'Mike Trainer', daysAgo: 10 },
    // Other expenses
    { amount: 299.00, category: ExpenseCategory.SUPPLIES, description: 'Cleaning Supplies', vendor: 'CleanCo', daysAgo: 22 },
    { amount: 150.00, category: ExpenseCategory.SUPPLIES, description: 'Towels (50x)', vendor: 'Towel World', daysAgo: 28 },
    { amount: 89.00, category: ExpenseCategory.SUPPLIES, description: 'Hand Sanitizer & Wipes', vendor: 'SafeClean', daysAgo: 14 },
    { amount: 1200.00, category: ExpenseCategory.INSURANCE, description: 'Liability Insurance - Monthly', vendor: 'GymSafe Insurance', daysAgo: 4 },
    { amount: 1200.00, category: ExpenseCategory.INSURANCE, description: 'Liability Insurance - Monthly', vendor: 'GymSafe Insurance', daysAgo: 34 },
    { amount: 350.00, category: ExpenseCategory.OTHER, description: 'Accounting Software', vendor: 'QuickBooks', daysAgo: 6 },
    { amount: 99.00, category: ExpenseCategory.OTHER, description: 'Music Streaming License', vendor: 'Soundtrack Your Brand', daysAgo: 8 },
  ];

  for (const exp of expenseData) {
    await prisma.expense.create({
      data: {
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        vendor: exp.vendor,
        date: randomDate(exp.daysAgo),
        gymId: gym.id,
        staffId: owner.id, // Owner recorded the expenses
        createdAt: randomDate(exp.daysAgo),
      },
    });
  }

  console.log('Created', expenseData.length, 'expenses');

  // ===== PAYOUTS =====
  const payoutData = [
    { amount: 5250.00, status: PayoutStatus.PAID, description: 'Weekly Payout - Jan Week 2', daysAgo: 3 },
    { amount: 4890.00, status: PayoutStatus.PAID, description: 'Weekly Payout - Jan Week 1', daysAgo: 10 },
    { amount: 5120.00, status: PayoutStatus.PAID, description: 'Weekly Payout - Dec Week 4', daysAgo: 17 },
    { amount: 4750.00, status: PayoutStatus.PAID, description: 'Weekly Payout - Dec Week 3', daysAgo: 24 },
    { amount: 5500.00, status: PayoutStatus.PROCESSING, description: 'Weekly Payout - Jan Week 3', daysAgo: 0 },
    { amount: 3200.00, status: PayoutStatus.PENDING, description: 'Pending Payout', daysAgo: 0 },
    { amount: 4100.00, status: PayoutStatus.FAILED, description: 'Failed Payout - Bank Error', daysAgo: 5 },
  ];

  for (const payout of payoutData) {
    const scheduledDate = randomDate(payout.daysAgo);
    const paidAt = payout.status === PayoutStatus.PAID ? new Date(scheduledDate.getTime() + 2 * 24 * 60 * 60 * 1000) : null;

    await prisma.payout.create({
      data: {
        amount: payout.amount,
        status: payout.status,
        description: payout.description,
        scheduledDate: scheduledDate,
        paidAt: paidAt,
        gymId: gym.id,
        createdAt: scheduledDate,
      },
    });
  }

  console.log('Created', payoutData.length, 'payouts');

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
  console.log('  - 18 payments (completed, pending, failed, refunded)');
  console.log('  - 10 invoices with line items');
  console.log('  - 27 expenses across all categories');
  console.log('  - 7 payouts (paid, processing, pending, failed)');
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
