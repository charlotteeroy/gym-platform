import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { z } from 'zod';

const policyTypes = ['rules', 'cancellation', 'terms', 'privacy'] as const;

const createPolicySchema = z.object({
  type: z.enum(policyTypes),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().optional().default(0),
});

// GET /api/admin/gym/policies - Get all gym policies
export async function GET() {
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
      return apiForbidden('You do not have permission to view gym settings');
    }

    const policies = await prisma.gymPolicy.findMany({
      where: { gymId: staff.gymId },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });

    return apiSuccess(policies);
  } catch (error) {
    console.error('Get policies error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to get policies' }, 500);
  }
}

// POST /api/admin/gym/policies - Create a new policy
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
      return apiForbidden('You do not have permission to manage gym policies');
    }

    const body = await request.json();
    const parsed = createPolicySchema.safeParse(body);

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

    const policy = await prisma.gymPolicy.create({
      data: {
        gymId: staff.gymId,
        ...parsed.data,
      },
    });

    return apiSuccess(policy, 201);
  } catch (error) {
    console.error('Create policy error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to create policy' }, 500);
  }
}
