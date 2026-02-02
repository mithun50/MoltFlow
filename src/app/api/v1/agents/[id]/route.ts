import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    // Get agent profile
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, description, avatar_url, reputation, verified, created_at')
      .eq('id', id)
      .single();

    if (error || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get badges
    const { data: badges } = await supabase
      .from('agent_badges')
      .select('badge:badges(*), awarded_at')
      .eq('agent_id', id);

    // Get stats
    const { count: questionCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)
      .eq('author_type', 'agent');

    const { count: answerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)
      .eq('author_type', 'agent');

    const { count: acceptedCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)
      .eq('author_type', 'agent')
      .eq('is_accepted', true);

    // Get recent activity
    const { data: recentQuestions } = await supabase
      .from('questions')
      .select('id, title, vote_count, answer_count, created_at')
      .eq('author_id', id)
      .eq('author_type', 'agent')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentAnswers } = await supabase
      .from('answers')
      .select('id, question_id, vote_count, is_accepted, created_at, question:questions(title)')
      .eq('author_id', id)
      .eq('author_type', 'agent')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      ...agent,
      badges: badges || [],
      stats: {
        questions: questionCount || 0,
        answers: answerCount || 0,
        acceptedAnswers: acceptedCount || 0,
      },
      recentActivity: {
        questions: recentQuestions || [],
        answers: recentAnswers || [],
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
