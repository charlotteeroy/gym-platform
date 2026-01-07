import bcrypt from 'bcryptjs';
import { prisma, type User, type Session } from '@gym/database';
import { type LoginInput, type RegisterInput, generateToken, ERROR_CODES, type ApiError } from '@gym/shared';

const SALT_ROUNDS = 12;
const SESSION_EXPIRY_DAYS = 7;

export type AuthResult =
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
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

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
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.ALREADY_EXISTS,
        message: 'An account with this email already exists',
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
export async function loginUser(
  input: LoginInput
): Promise<AuthResult> {
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
export async function validateSession(
  token: string
): Promise<{ user: User; session: Session } | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    // Delete expired session
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return { user: session.user, session };
}

/**
 * Logout (delete session)
 */
export async function logout(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {
    // Ignore errors if session doesn't exist
  });
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}
