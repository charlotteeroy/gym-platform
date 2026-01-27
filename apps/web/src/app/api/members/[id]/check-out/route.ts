import { getMemberById, checkOutMember } from '@gym/core';
import { getSession, getCurrentStaff } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api';
import { prisma } from '@gym/database';

// POST /api/members/[id]/check-out - Record member exit
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return apiUnauthorized();

    const { id } = await params;
    const member = await getMemberById(id);
    if (!member) return apiNotFound('Member not found');

    const staff = await getCurrentStaff(member.gymId);
    if (!staff) return apiForbidden('You do not have access to this member');

    // Find the most recent check-in without a check-out
    const activeCheckIn = await prisma.checkIn.findFirst({
      where: {
        memberId: id,
        checkedOutAt: null,
      },
      orderBy: { checkedInAt: 'desc' },
    });

    if (!activeCheckIn) {
      return apiError(
        { code: 'NO_ACTIVE_CHECKIN', message: 'No active check-in found for this member' },
        400
      );
    }

    let notes: string | undefined;
    try {
      const body = await request.json();
      notes = body?.notes;
    } catch {
      // No body is fine
    }

    const result = await checkOutMember(activeCheckIn.id, notes);

    if (!result.success) {
      return apiError(result.error, 400);
    }

    return apiSuccess(result.checkIn);
  } catch (error) {
    console.error('Error checking out member:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to check out member' }, 500);
  }
}
