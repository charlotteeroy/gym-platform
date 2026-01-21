import { listMemberInvoices } from '@gym/core';
import { prisma } from '@gym/database';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api';

/**
 * GET /api/portal/billing/invoices
 * Get member's invoice history
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!member) {
      return apiError({ code: 'NOT_FOUND', message: 'Member not found' }, 404);
    }

    const result = await listMemberInvoices(member.id, Math.min(limit, 100));

    if (!result.success) {
      return apiError(result.error, 400);
    }

    const invoices = result.invoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status,
      description: inv.description || (inv.lines?.data?.[0]?.description ?? 'Subscription'),
      periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
      createdAt: new Date(inv.created * 1000).toISOString(),
      paidAt: inv.status_transitions?.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
        : null,
      invoicePdf: inv.invoice_pdf,
      hostedInvoiceUrl: inv.hosted_invoice_url,
    }));

    return apiSuccess(invoices);
  } catch (error) {
    console.error('List invoices error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load invoices' }, 500);
  }
}
