import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import { updateReputation, checkAndAwardBadges, createNotification } from '@/lib/reputation';
import type { VoteRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: VoteRequest = await request.json();

    if (!['question', 'answer', 'prompt'].includes(body.target_type)) {
      return NextResponse.json(
        { error: 'Invalid target type' },
        { status: 400 }
      );
    }

    if (![1, -1].includes(body.value)) {
      return NextResponse.json(
        { error: 'Value must be 1 or -1' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Get the target
    const tableName =
      body.target_type === 'question'
        ? 'questions'
        : body.target_type === 'answer'
        ? 'answers'
        : 'prompts';

    const { data: target, error: targetError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', body.target_id)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      );
    }

    const voterId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const voterType = auth.type === 'agent' ? 'agent' : 'expert';

    // Can't vote on your own content
    if (target.author_id === voterId) {
      return NextResponse.json(
        { error: 'You cannot vote on your own content' },
        { status: 400 }
      );
    }

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('voter_id', voterId)
      .eq('voter_type', voterType)
      .eq('target_type', body.target_type)
      .eq('target_id', body.target_id)
      .single();

    if (existingVote) {
      if (existingVote.value === body.value) {
        // Same vote - remove it (toggle off)
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error('Failed to delete vote:', deleteError);
          return NextResponse.json(
            { error: 'Failed to remove vote' },
            { status: 500 }
          );
        }

        // Reverse the reputation change
        if (target.author_type === 'agent') {
          const action =
            body.target_type === 'question'
              ? body.value === 1
                ? 'question_downvote'
                : 'question_upvote' // Reverse
              : body.value === 1
              ? 'answer_downvote'
              : 'answer_upvote';
          await updateReputation(target.author_id, action);
        }

        return NextResponse.json({ action: 'removed', value: 0 });
      } else {
        // Different vote - update it
        const { error: updateError } = await supabase
          .from('votes')
          .update({ value: body.value })
          .eq('id', existingVote.id);

        if (updateError) {
          console.error('Failed to update vote:', updateError);
          return NextResponse.json(
            { error: 'Failed to update vote' },
            { status: 500 }
          );
        }

        // Update reputation (double change: remove old, add new)
        if (target.author_type === 'agent') {
          // This is handled by the trigger, but we need to adjust for the direction change
          // The trigger handles the math automatically
        }

        return NextResponse.json({ action: 'changed', value: body.value });
      }
    }

    // Create new vote
    const { error: insertError } = await supabase.from('votes').insert({
      voter_id: voterId,
      voter_type: voterType,
      target_type: body.target_type,
      target_id: body.target_id,
      value: body.value,
    });

    if (insertError) {
      console.error('Failed to create vote:', insertError);
      return NextResponse.json(
        { error: 'Failed to create vote' },
        { status: 500 }
      );
    }

    // Update author's reputation if they're an agent
    if (target.author_type === 'agent') {
      const action =
        body.target_type === 'question'
          ? body.value === 1
            ? 'question_upvote'
            : 'question_downvote'
          : body.value === 1
          ? 'answer_upvote'
          : 'answer_downvote';
      await updateReputation(target.author_id, action);

      // Check for badges on upvotes
      if (body.value === 1) {
        const badges = await checkAndAwardBadges(target.author_id);
        for (const badge of badges) {
          await createNotification({
            recipientId: target.author_id,
            recipientType: 'agent',
            type: 'badge',
            title: `You earned the "${badge}" badge!`,
            link: `/agents/${target.author_id}`,
          });
        }
      }

      // Notify on upvotes (don't notify on downvotes to avoid negativity)
      if (body.value === 1) {
        const link =
          body.target_type === 'question'
            ? `/questions/${body.target_id}`
            : body.target_type === 'answer'
            ? `/questions/${target.question_id}`
            : `/prompts/${body.target_id}`;

        await createNotification({
          recipientId: target.author_id,
          recipientType: 'agent',
          type: 'vote',
          title: `Your ${body.target_type} received an upvote!`,
          link,
        });
      }
    }

    return NextResponse.json({ action: 'created', value: body.value }, { status: 201 });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
