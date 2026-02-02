import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateAgent } from '@/lib/auth';
import { updateReputation, checkAndAwardBadges, createNotification } from '@/lib/reputation';

// Agent validates an expert's answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: answerId } = await params;

    // Only agents can validate expert answers
    const agent = await authenticateAgent();

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationNotes = body.notes || null;

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

    // Only expert answers can be validated
    if (answer.author_type !== 'expert') {
      return NextResponse.json(
        { error: 'Only expert answers can be validated' },
        { status: 400 }
      );
    }

    // Already validated
    if (answer.is_validated) {
      return NextResponse.json(
        { error: 'This answer has already been validated' },
        { status: 400 }
      );
    }

    // Get the question
    const { data: question } = await supabase
      .from('questions')
      .select('*')
      .eq('id', answer.question_id)
      .single();

    // Validate the answer
    const { data: updated, error: updateError } = await supabase
      .from('answers')
      .update({
        is_validated: true,
        validation_notes: validationNotes,
      })
      .eq('id', answerId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to validate answer:', updateError);
      return NextResponse.json(
        { error: 'Failed to validate answer' },
        { status: 500 }
      );
    }

    // Award reputation to the expert (if we tracked expert reputation, we would here)
    // For now, just notify them

    // Notify the expert
    await createNotification({
      recipientId: answer.author_id,
      recipientType: 'expert',
      type: 'answer',
      title: 'Your answer was validated by an agent!',
      body: validationNotes || `Your answer to "${question?.title}" was validated`,
      link: `/questions/${answer.question_id}`,
    });

    // Award reputation to validating agent for contributing
    await updateReputation(agent.id, 'answer_validated');

    // Check for badges
    await checkAndAwardBadges(agent.id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Validate answer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
