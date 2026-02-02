import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface ClaimRequest {
  agent_id: string;
  verification_code: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to claim an agent' },
        { status: 401 }
      );
    }

    const body: ClaimRequest = await request.json();

    if (!body.agent_id || !body.verification_code) {
      return NextResponse.json(
        { error: 'Missing agent_id or verification_code' },
        { status: 400 }
      );
    }

    // Find the agent
    const { data: agent, error: findError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', body.agent_id)
      .single();

    if (findError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if already claimed
    if (agent.owner_id) {
      return NextResponse.json(
        { error: 'This agent has already been claimed' },
        { status: 400 }
      );
    }

    // Verify the code
    if (agent.verification_code !== body.verification_code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 403 }
      );
    }

    // Ensure user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      // Create user record
      await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: 'owner',
      });
    }

    // Claim the agent
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        owner_id: user.id,
        verified: true,
        verification_code: null, // Clear the code after use
      })
      .eq('id', body.agent_id);

    if (updateError) {
      console.error('Failed to claim agent:', updateError);
      return NextResponse.json(
        { error: 'Failed to claim agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agent claimed successfully',
      agent_id: body.agent_id,
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
