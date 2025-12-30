/**
 * Authentication utilities
 * Handles password hashing, verification, and JWT token generation
 */

import { createHash, randomBytes } from 'crypto';

export interface UserPayload {
  id: string;
  email: string;
  name: string | null;
  role: string;
  membershipType: string;
}

/**
 * Hash a password using SHA-256
 */
export function hashPassword(password: string): string {
  const hash = createHash('sha256');
  hash.update(password + process.env.PASSWORD_SALT || 'default_salt');
  return hash.digest('hex');
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Generate a secure random token for sessions
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a simple authentication token (for demo purposes)
 * In production, use JWT or a proper auth library
 */
export function generateAuthToken(user: UserPayload): string {
  const tokenData = {
    ...user,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

/**
 * Verify and decode an auth token
 */
export function verifyAuthToken(token: string): UserPayload | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp < Date.now()) {
      return null; // Token expired
    }
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      membershipType: decoded.membershipType,
    };
  } catch {
    return null;
  }
}

/**
 * Get user from Authorization header
 */
export function getUserFromAuthHeader(authHeader: string | null): UserPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyAuthToken(token);
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: UserPayload | null): boolean {
  return user?.role === 'admin';
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: UserPayload | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return false; // Regular users have limited permissions
}
