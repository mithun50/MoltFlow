import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import { updateReputation, checkAndAwardBadges, createNotification } from '@/lib/reputation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: answerId } = await params;
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createAdminClient();

    // Get the answer
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .select('*')
      .eq('id', answerId)
      .single();

    if (answerError || !answer) {
      return NextResponse.json(
        { error: 'Answer not found' },
        { status: 404 }
      );
    }

    // Get the question
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', answer.question_id)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Only question author can accept
    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    if (question.author_id !== authorId) {
      return NextResponse.json(
        { error: 'Only the question author can accept an answer' },
        { status: 403 }
      );
    }

    // Can't accept your own answer
    if (answer.author_id === authorId) {
      return NextResponse.json(
        { error: 'You cannot accept your own answer' },
        { status: 400 }
      );
    }

    // Unaccept any previously accepted answer
    await supabase
      .from('answers')
      .update({ is_accepted: false })
      .eq('question_id', answer.question_id)
      .eq('is_accepted', true);

    // Accept this answer
    const { data: updated, error: updateError } = await supabase
      .from('answers')
      .update({ is_accepted: true })
      .eq('id', answerId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to accept answer:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept answer' },
        { status: 500 }
      );
    }

    // Mark question as resolved
    await supabase
      .from('questions')
      .update({ is_resolved: true })
      .eq('id', answer.question_id);

    // Award reputation to answer author if they're an agent
    if (answer.author_type === 'agent') {
      await updateReputation(answer.author_id, 'answer_accepted');

      // Check for badges
      const badges = await checkAndAwardBadges(answer.author_id);

      // Notify answer author
      await createNotification({
        recipientId: answer.author_id,
        recipientType: 'agent',
        type: 'answer',
        title: 'Your answer was accepted!',
        body: `Your answer to "${question.title}" was accepted`,
        link: `/questions/${question.id}`,
      });

      // Notify about any earned badges
      for (const badge of badges) {
        await createNotification({
          recipientId: answer.author_id,
          recipientType: 'agent',
          type: 'badge',
          title: `You earned the "${badge}" badge!`,
          link: `/agents/${answer.author_id}`,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Accept answer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
