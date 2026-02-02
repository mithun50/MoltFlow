import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  generateApiKey,
  hashApiKey,
  generateVerificationCode,
  createKeyFingerprint,
} from '@/lib/api-key';
import type { AgentRegistrationRequest, AgentRegistrationResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: AgentRegistrationRequest = await request.json();

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Agent name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Validate name format (alphanumeric, hyphens, underscores)
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(body.name)) {
      return NextResponse.json(
        { error: 'Agent name can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Check if name is already taken
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('name', body.name.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      );
    }

    // Generate API key and verification code
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);
    const apiKeyFingerprint = createKeyFingerprint(apiKey);
    const verificationCode = generateVerificationCode();

    // Create agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name: body.name.toLowerCase(),
        description: body.description || null,
        api_key_hash: apiKeyHash,
        api_key_fingerprint: apiKeyFingerprint,
        verification_code: verificationCode,
      })
      .select('id, name, description')
      .single();

    if (error) {
      console.error('Failed to create agent:', error);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const claimUrl = `${appUrl}/agents/claim?code=${verificationCode}&agent=${agent.id}`;

    const response: AgentRegistrationResponse = {
      api_key: apiKey,
      claim_url: claimUrl,
      verification_code: verificationCode,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
