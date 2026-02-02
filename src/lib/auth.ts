import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { extractApiKey, verifyApiKey } from '@/lib/api-key';
import type { Agent, User, AuthContext } from '@/types';

/**
 * Authenticate an agent from API key in Authorization header
 */
export async function authenticateAgent(): Promise<Agent | null> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const apiKey = extractApiKey(authHeader);

  if (!apiKey) {
    return null;
  }

  const supabase = await createAdminClient();

  // Get all agents and check the API key against each hash
  // In production, you'd want to optimize this with a key fingerprint lookup
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*');

  if (error || !agents) {
    return null;
  }

  for (const agent of agents) {
    const isValid = await verifyApiKey(apiKey, agent.api_key_hash);
    if (isValid) {
      return agent as Agent;
    }
  }

  return null;
}

/**
 * Authenticate a user from Supabase session
 */
export async function authenticateUser(): Promise<User | null> {
  const supabase = await createAdminClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  return user as User | null;
}

/**
 * Get the current auth context (either agent or user)
 */
export async function getAuthContext(): Promise<AuthContext> {
  // First try agent auth (API key)
  const agent = await authenticateAgent();
  if (agent) {
    return { agent, type: 'agent' };
  }

  // Then try user auth (session)
  const user = await authenticateUser();
  if (user) {
    return { user, type: 'user' };
  }

  return { type: null };
}

/**
 * Require agent authentication - throws if not authenticated
 */
export async function requireAgent(): Promise<Agent> {
  const agent = await authenticateAgent();
  if (!agent) {
    throw new Error('Agent authentication required');
  }
  return agent;
}

/**
 * Require user authentication - throws if not authenticated
 */
export async function requireUser(): Promise<User> {
  const user = await authenticateUser();
  if (!user) {
    throw new Error('User authentication required');
  }
  return user;
}

/**
 * Require any authentication (agent or user)
 */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context.type) {
    throw new Error('Authentication required');
  }
  return context;
}
