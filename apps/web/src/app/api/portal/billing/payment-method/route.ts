import { createSetupIntent, listPaymentMethods, deletePaymentMethod, setDefaultPaymentMethod } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

/**
 * GET /api/portal/billing/payment-method
 * Get member's payment methods
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const result = await listPaymentMethods(member.id);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    const paymentMethods = result.paymentMethods.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));

    return apiSuccess(paymentMethods);
  } catch (error) {
    console.error('List payment methods error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load payment methods' }, 500);
  }
}

/**
 * POST /api/portal/billing/payment-method
 * Create a SetupIntent for adding a new payment method
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const result = await createSetupIntent(member.id);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess({ clientSecret: result.clientSecret });
  } catch (error) {
    console.error('Create setup intent error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to initialize payment setup' }, 500);
  }
}

/**
 * DELETE /api/portal/billing/payment-method
 * Delete a payment method
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return apiError({ code: 'INVALID_INPUT', message: 'Payment method ID is required' }, 400);
    }

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const result = await deletePaymentMethod(member.id, paymentMethodId);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Payment method removed' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to delete payment method' }, 500);
  }
}

/**
 * PATCH /api/portal/billing/payment-method
 * Set default payment method
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return apiError({ code: 'INVALID_INPUT', message: 'Payment method ID is required' }, 400);
    }

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const result = await setDefaultPaymentMethod(member.id, paymentMethodId);

    if (!result.success) {
      return apiError(result.error!, 400);
    }

    return apiSuccess({ message: 'Default payment method updated' });
  } catch (error) {
    console.error('Set default payment method error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to update default payment method' }, 500);
  }
}
