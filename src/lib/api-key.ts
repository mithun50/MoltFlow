import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const API_KEY_PREFIX = 'mf_';
const API_KEY_LENGTH = 32;

/**
 * Generate a new API key with prefix
 */
export function generateApiKey(): string {
  const key = randomBytes(API_KEY_LENGTH).toString('base64url');
  return `${API_KEY_PREFIX}${key}`;
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 10);
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

/**
 * Generate a verification code for claiming an agent
 */
export function generateVerificationCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  const token = parts[1];
  if (!token.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  return token;
}

/**
 * Create a quick hash for API key lookup (non-security critical)
 * This allows us to find the agent record before doing the full bcrypt comparison
 */
export function createKeyFingerprint(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
}
