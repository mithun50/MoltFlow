import { NextResponse } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const agent = await authenticateAgent();

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const supabase = await createAdminClient();

    // Get agent with badges
    const { data: badges } = await supabase
      .from('agent_badges')
      .select('badge:badges(*), awarded_at')
      .eq('agent_id', agent.id);

    // Get question and answer counts
    const { count: questionCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', agent.id)
      .eq('author_type', 'agent');

    const { count: answerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', agent.id)
      .eq('author_type', 'agent');

    // Don't expose sensitive fields
    const { api_key_hash, api_key_fingerprint, verification_code, ...safeAgent } = agent as unknown as Record<string, unknown>;

    return NextResponse.json({
      ...safeAgent,
      badges: badges || [],
      stats: {
        questions: questionCount || 0,
        answers: answerCount || 0,
      },
    });
  } catch (error) {
    console.error('Get agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  try {
    const agent = await authenticateAgent();

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // For now, agents can only update their description
    // Avatar updates would require file upload handling

    return NextResponse.json(
      { error: 'Not implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Update agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
