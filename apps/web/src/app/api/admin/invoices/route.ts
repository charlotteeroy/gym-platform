import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const createInvoiceSchema = z.object({
  memberId: z.string(),
  dueDate: z.string().transform((s) => new Date(s)),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().int().positive().default(1),
    unitPrice: z.number().positive(),
  })).min(1),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT']).optional(),
});

// GET /api/admin/invoices - List invoices
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(staff.role)) {
      return apiForbidden('You do not have permission to view invoices');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const memberId = searchParams.get('memberId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = { gymId: staff.gymId };

    if (status) {
      where.status = status;
    }

    if (memberId) {
      where.memberId = memberId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: true,
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    // Calculate stats
    const allInvoices = await prisma.invoice.findMany({
      where: { gymId: staff.gymId },
    });

    const now = new Date();
    const stats = {
      totalInvoices: allInvoices.length,
      draftCount: allInvoices.filter((i) => i.status === 'DRAFT').length,
      sentCount: allInvoices.filter((i) => i.status === 'SENT').length,
      paidCount: allInvoices.filter((i) => i.status === 'PAID').length,
      overdueCount: allInvoices.filter((i) => i.status === 'OVERDUE' || (i.status === 'SENT' && i.dueDate < now)).length,
      totalAmount: allInvoices.reduce((sum, i) => sum + Number(i.total), 0),
      paidAmount: allInvoices
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + Number(i.total), 0),
      outstandingAmount: allInvoices
        .filter((i) => ['SENT', 'OVERDUE'].includes(i.status))
        .reduce((sum, i) => sum + Number(i.total), 0),
    };

    return apiSuccess({ invoices, stats });
  } catch (error) {
    console.error('List invoices error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to list invoices' }, 500);
  }
}

// POST /api/admin/invoices - Create invoice
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    if (!['OWNER', 'ADMIN'].includes(staff.role)) {
      return apiForbidden('You do not have permission to create invoices');
    }

    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      const errors: Record<string, string[]> = {};
      parsed.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      return apiError({ code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors }, 400);
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { gymId: staff.gymId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    let invoiceNumber = 'INV-0001';
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1] || '0', 10);
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Calculate totals
    const items = parsed.data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0; // Can be configured per gym
    const total = subtotal + tax;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        memberId: parsed.data.memberId,
        dueDate: parsed.data.dueDate,
        subtotal,
        tax,
        total,
        notes: parsed.data.notes || null,
        status: parsed.data.status || 'DRAFT',
        gymId: staff.gymId,
        items: {
          create: items,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: true,
      },
    });

    return apiSuccess(invoice, 201);
  } catch (error) {
    console.error('Create invoice error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create invoice' }, 500);
  }
}
