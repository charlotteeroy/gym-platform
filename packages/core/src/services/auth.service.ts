import bcrypt from 'bcryptjs';
import { prisma, type User, type Session } from '@gym/database';
import {
  type LoginInput,
  type RegisterInput,
  generateToken,
  ERROR_CODES,
  type ApiError,
} from '@gym/shared';
import { addDays } from '@gym/shared';

const SALT_ROUNDS = 12;
const SESSION_DURATION_DAYS = 30;

export type AuthResult =
  | { success: true; user: User; session: Session }
  | { success: false; error: ApiError };

export type TokenValidationResult =
  | { success: true; user: User; session: Session }
  | { success: false; error: ApiError };

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<Session> {
  const token = generateToken(64);
  const expiresAt = addDays(new Date(), SESSION_DURATION_DAYS);

  return prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

/**
 * Register a new user
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'A user with this email already exists',
      },
    };
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
    },
  });

  // Create session
  const session = await createSession(user.id);

  return { success: true, user, session };
}

/**
 * Login a user
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      },
    };
  }

  // Verify password
  const isValid = await verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      },
    };
  }

  // Create session
  const session = await createSession(user.id);

  return { success: true, user, session };
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<TokenValidationResult> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.SESSION_EXPIRED,
        message: 'Session not found',
      },
    };
  }

  if (session.expiresAt < new Date()) {
    // Delete expired session
    await prisma.session.delete({ where: { id: session.id } });

    return {
      success: false,
      error: {
        code: ERROR_CODES.SESSION_EXPIRED,
        message: 'Session has expired',
      },
    };
  }

  return {
    success: true,
    user: session.user,
    session,
  };
}

/**
 * Logout (delete session)
 */
export async function logout(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

/**
 * Delete all sessions for a user
 */
export async function logoutAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

/**
 * Create password reset token
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Return null but don't reveal that user doesn't exist
    return null;
  }

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({
    where: { email },
  });

  // Create new token
  const token = generateToken(64);
  const expiresAt = addDays(new Date(), 1); // 24 hours

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Reset password using token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: ApiError }> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Invalid or expired reset token',
      },
    };
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password
  await prisma.user.update({
    where: { email: resetToken.email },
    data: { passwordHash },
  });

  // Delete reset token
  await prisma.passwordResetToken.delete({
    where: { id: resetToken.id },
  });

  // Invalidate all sessions
  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
  });

  if (user) {
    await logoutAllSessions(user.id);
  }

  return { success: true };
}

/**
 * Change password for authenticated user
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: ApiError }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'User not found',
      },
    };
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValid) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Current password is incorrect',
      },
    };
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}
