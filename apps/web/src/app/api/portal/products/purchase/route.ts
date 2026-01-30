import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiError, apiValidationError } from '@/lib/api';
import { z } from 'zod';

const purchaseSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
});

// POST /api/portal/products/purchase - Purchase a pass/product
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const member = await prisma.member.findUnique({
      where: { userId: session.user.id },
      select: { id: true, gymId: true },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const body = await request.json();
    const parsed = purchaseSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return apiValidationError(errors);
    }

    const { productId } = parsed.data;

    // Verify product exists and is active
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        gymId: member.gymId,
        isActive: true,
        type: { in: ['CLASS_PACK', 'DROP_IN', 'COMBO'] },
      },
    });

    if (!product) {
      return apiError({ code: 'NOT_FOUND', message: 'Product not found' }, 404);
    }

    // Calculate expiration date if validityDays is set
    let expiresAt: Date | null = null;
    if (product.validityDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + product.validityDays);
    }

    // Create the pass for the member
    const pass = await prisma.memberPass.create({
      data: {
        memberId: member.id,
        gymId: member.gymId,
        productId: product.id,
        status: 'ACTIVE',
        bonusTotal: product.bonusCount || 0,
        bonusRemaining: product.bonusCount || 0,
        expiresAt,
      },
      include: {
        product: {
          select: {
            name: true,
            type: true,
            bonusCount: true,
            validityDays: true,
            priceAmount: true,
          },
        },
      },
    });

    // Create a payment record for this purchase
    await prisma.payment.create({
      data: {
        amount: product.priceAmount,
        status: 'COMPLETED',
        method: 'CARD', // Default to card for now
        description: `Purchase: ${product.name}`,
        memberId: member.id,
        gymId: member.gymId,
      },
    });

    return apiSuccess(pass, 201);
  } catch (error) {
    console.error('Error purchasing product:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to purchase product' }, 500);
  }
}
