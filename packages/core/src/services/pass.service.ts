import { prisma } from '@gym/database';
import type { MemberPassStatus } from '@gym/database';
import type { PassBalance, MemberAccessSummary } from '@gym/shared';

const ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  INVALID_PRODUCT: 'INVALID_PRODUCT',
  PASS_DEPLETED: 'PASS_DEPLETED',
  PASS_EXPIRED: 'PASS_EXPIRED',
  PASS_NOT_ACTIVE: 'PASS_NOT_ACTIVE',
  HAS_ACTIVE_PASSES: 'HAS_ACTIVE_PASSES',
} as const;

export type PassResult =
  | { success: true; data: any }
  | { success: false; error: { code: string; message: string } };

// ============================================
// PASS PRODUCT MANAGEMENT
// ============================================

export async function getGymPassProducts(gymId: string) {
  return prisma.product.findMany({
    where: {
      gymId,
      type: { in: ['CLASS_PACK', 'DROP_IN'] },
    },
    include: {
      _count: {
        select: {
          passes: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
    orderBy: [{ isActive: 'desc' }, { priceAmount: 'asc' }],
  });
}

export async function getPassProductById(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      _count: {
        select: {
          passes: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
  });
}

// ============================================
// MEMBER PASS MANAGEMENT
// ============================================

export async function activatePass(
  memberId: string,
  productId: string,
  gymId: string,
  purchaseId?: string,
  notes?: string
): Promise<PassResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Product not found' },
    };
  }

  if (!['CLASS_PACK', 'DROP_IN'].includes(product.type)) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_PRODUCT,
        message: 'Product is not a class pack or drop-in',
      },
    };
  }

  const bonuses = product.bonusCount ?? 1;
  const expiresAt = product.validityDays
    ? new Date(Date.now() + product.validityDays * 24 * 60 * 60 * 1000)
    : null;

  const memberPass = await prisma.memberPass.create({
    data: {
      memberId,
      productId,
      gymId,
      purchaseId: purchaseId || undefined,
      bonusTotal: bonuses,
      bonusRemaining: bonuses,
      expiresAt,
      notes,
      status: 'ACTIVE',
    },
    include: {
      product: true,
    },
  });

  return { success: true, data: memberPass };
}

export async function deductBonus(
  memberPassId: string,
  amount: number = 1
): Promise<PassResult> {
  const pass = await prisma.memberPass.findUnique({
    where: { id: memberPassId },
    include: { product: true },
  });

  if (!pass) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Pass not found' },
    };
  }

  if (pass.status !== 'ACTIVE') {
    return {
      success: false,
      error: { code: ERROR_CODES.PASS_NOT_ACTIVE, message: `Pass is ${pass.status.toLowerCase()}` },
    };
  }

  if (pass.expiresAt && pass.expiresAt < new Date()) {
    await prisma.memberPass.update({
      where: { id: memberPassId },
      data: { status: 'EXPIRED' },
    });
    return {
      success: false,
      error: { code: ERROR_CODES.PASS_EXPIRED, message: 'Pass has expired' },
    };
  }

  if (pass.bonusRemaining < amount) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.PASS_DEPLETED,
        message: `Insufficient bonuses: ${pass.bonusRemaining} remaining, ${amount} required`,
      },
    };
  }

  const newRemaining = pass.bonusRemaining - amount;
  const updated = await prisma.memberPass.update({
    where: { id: memberPassId },
    data: {
      bonusRemaining: newRemaining,
      status: newRemaining === 0 ? 'DEPLETED' : 'ACTIVE',
    },
  });

  return { success: true, data: updated };
}

export async function getMemberPasses(memberId: string) {
  return prisma.memberPass.findMany({
    where: { memberId },
    include: {
      product: true,
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getActivePasses(memberId: string) {
  return prisma.memberPass.findMany({
    where: {
      memberId,
      status: 'ACTIVE',
      bonusRemaining: { gt: 0 },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      product: true,
    },
    orderBy: { expiresAt: 'asc' },
  });
}

export async function getMemberAccessSummary(
  memberId: string
): Promise<MemberAccessSummary> {
  const [member, activePasses] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      include: {
        subscription: true,
      },
    }),
    getActivePasses(memberId),
  ]);

  const hasActiveSubscription = !!(
    member?.subscription &&
    ['ACTIVE', 'PAST_DUE'].includes(member.subscription.status)
  );

  const passBalances: PassBalance[] = activePasses.map((p) => ({
    passId: p.id,
    productName: p.product.name,
    bonusRemaining: p.bonusRemaining,
    bonusTotal: p.bonusTotal,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    status: p.status as PassBalance['status'],
  }));

  const totalBonusAvailable = passBalances.reduce(
    (sum, p) => sum + p.bonusRemaining,
    0
  );

  let accessType: MemberAccessSummary['accessType'] = 'none';
  if (hasActiveSubscription) {
    accessType = 'subscription';
  } else if (totalBonusAvailable > 0) {
    accessType = 'pass';
  }

  return {
    hasActiveSubscription,
    activePasses: passBalances,
    totalBonusAvailable,
    canCheckIn: hasActiveSubscription || totalBonusAvailable > 0,
    accessType,
  };
}

export async function expireOverduePasses(gymId: string) {
  const result = await prisma.memberPass.updateMany({
    where: {
      gymId,
      status: 'ACTIVE',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return result.count;
}

export async function cancelPass(
  memberPassId: string,
  reason?: string
): Promise<PassResult> {
  const pass = await prisma.memberPass.findUnique({
    where: { id: memberPassId },
  });

  if (!pass) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Pass not found' },
    };
  }

  const updated = await prisma.memberPass.update({
    where: { id: memberPassId },
    data: {
      status: 'CANCELLED',
      notes: reason
        ? `${pass.notes ? pass.notes + '\n' : ''}Cancelled: ${reason}`
        : pass.notes,
    },
    include: { product: true },
  });

  return { success: true, data: updated };
}

export async function getPassById(passId: string) {
  return prisma.memberPass.findUnique({
    where: { id: passId },
    include: {
      product: true,
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      checkIns: {
        orderBy: { checkedInAt: 'desc' },
        take: 10,
      },
    },
  });
}
