import { listPaymentMethods, listMemberInvoices } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

/**
 * GET /api/portal/billing
 * Get member's billing information
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    // Get member from session
    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        gym: {
          select: {
            name: true,
            currency: true,
            stripeChargesEnabled: true,
          },
        },
      },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    // Get payment methods
    const paymentMethodsResult = await listPaymentMethods(member.id);
    const paymentMethods = paymentMethodsResult.success
      ? paymentMethodsResult.paymentMethods.map((pm) => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: false, // TODO: Check default
        }))
      : [];

    // Get recent invoices (last 5)
    const invoicesResult = await listMemberInvoices(member.id, 5);
    const invoices = invoicesResult.success
      ? invoicesResult.invoices.map((inv) => ({
          id: inv.id,
          number: inv.number,
          amount: inv.amount_paid / 100,
          currency: inv.currency,
          status: inv.status,
          paidAt: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : null,
          invoicePdf: inv.invoice_pdf,
        }))
      : [];

    // Build response
    const billingData = {
      member: {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        stripeCustomerId: member.stripeCustomerId,
      },
      subscription: member.subscription
        ? {
            id: member.subscription.id,
            status: member.subscription.status,
            plan: {
              id: member.subscription.plan.id,
              name: member.subscription.plan.name,
              priceAmount: Number(member.subscription.plan.priceAmount),
              billingInterval: member.subscription.plan.billingInterval,
            },
            currentPeriodStart: member.subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: member.subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: member.subscription.cancelAtPeriodEnd,
            cancelledAt: member.subscription.cancelledAt?.toISOString() || null,
            pausedAt: member.subscription.pausedAt?.toISOString() || null,
            resumeAt: member.subscription.resumeAt?.toISOString() || null,
          }
        : null,
      paymentMethods,
      recentInvoices: invoices,
      gym: {
        name: member.gym.name,
        currency: member.gym.currency,
        paymentsEnabled: member.gym.stripeChargesEnabled,
      },
    };

    return apiSuccess(billingData);
  } catch (error) {
    console.error('Portal billing error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load billing information' }, 500);
  }
}
