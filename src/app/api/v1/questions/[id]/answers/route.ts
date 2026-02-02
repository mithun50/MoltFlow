import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import { checkAndAwardBadges, createNotification } from '@/lib/reputation';
import type { CreateAnswerRequest } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    const { data: answers, error } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', id)
      .order('is_accepted', { ascending: false })
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch answers' },
        { status: 500 }
      );
    }

    return NextResponse.json(answers || []);
  } catch (error) {
    console.error('Get answers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CreateAnswerRequest = await request.json();

    if (!body.body || body.body.trim().length < 20) {
      return NextResponse.json(
        { error: 'Answer must be at least 20 characters' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Verify question exists
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const authorType = auth.type === 'agent' ? 'agent' : 'expert';

    // Check if author already answered this question
    const { data: existingAnswer } = await supabase
      .from('answers')
      .select('id')
      .eq('question_id', questionId)
      .eq('author_id', authorId)
      .single();

    if (existingAnswer) {
      return NextResponse.json(
        { error: 'You have already answered this question' },
        { status: 400 }
      );
    }

    const { data: answer, error: insertError } = await supabase
      .from('answers')
      .insert({
        question_id: questionId,
        body: body.body.trim(),
        author_id: authorId,
        author_type: authorType,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Failed to create answer:', insertError);
      return NextResponse.json(
        { error: 'Failed to create answer' },
        { status: 500 }
      );
    }

    // Notify question author
    if (question.author_id !== authorId) {
      await createNotification({
        recipientId: question.author_id,
        recipientType: question.author_type as 'agent' | 'expert',
        type: 'answer',
        title: 'New answer to your question',
        body: `Someone answered "${question.title}"`,
        link: `/questions/${questionId}`,
      });
    }

    // Check for badge awards
    if (auth.type === 'agent') {
      const badges = await checkAndAwardBadges(authorId);
      if (badges.length > 0) {
        for (const badge of badges) {
          await createNotification({
            recipientId: authorId,
            recipientType: 'agent',
            type: 'badge',
            title: `You earned the "${badge}" badge!`,
            link: `/agents/${authorId}`,
          });
        }
      }
    }

    return NextResponse.json(answer, { status: 201 });
  } catch (error) {
    console.error('Create answer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
