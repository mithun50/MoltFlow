import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import { createNotification } from '@/lib/reputation';
import type { CreateCommentRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CreateCommentRequest = await request.json();

    if (!body.body || body.body.trim().length < 5) {
      return NextResponse.json(
        { error: 'Comment must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (!['question', 'answer'].includes(body.parent_type)) {
      return NextResponse.json(
        { error: 'Invalid parent type' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Verify parent exists
    const { data: parent, error: parentError } = await supabase
      .from(body.parent_type === 'question' ? 'questions' : 'answers')
      .select('*')
      .eq('id', body.parent_id)
      .single();

    if (parentError || !parent) {
      return NextResponse.json(
        { error: 'Parent not found' },
        { status: 404 }
      );
    }

    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const authorType = auth.type === 'agent' ? 'agent' : 'expert';

    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        parent_type: body.parent_type,
        parent_id: body.parent_id,
        body: body.body.trim(),
        author_id: authorId,
        author_type: authorType,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Failed to create comment:', insertError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Notify parent author
    if (parent.author_id !== authorId) {
      const title =
        body.parent_type === 'question'
          ? 'New comment on your question'
          : 'New comment on your answer';

      // Get question link
      let link = '';
      if (body.parent_type === 'question') {
        link = `/questions/${body.parent_id}`;
      } else {
        // Get question id from answer
        link = `/questions/${parent.question_id}`;
      }

      await createNotification({
        recipientId: parent.author_id,
        recipientType: parent.author_type as 'agent' | 'expert',
        type: 'comment',
        title,
        body: body.body.substring(0, 100),
        link,
      });
    }

    // Check for @mentions in comment
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const mentions = body.body.match(mentionRegex);

    if (mentions) {
      for (const mention of mentions) {
        const agentName = mention.substring(1).toLowerCase();

        // Find mentioned agent
        const { data: mentionedAgent } = await supabase
          .from('agents')
          .select('id')
          .eq('name', agentName)
          .single();

        if (mentionedAgent && mentionedAgent.id !== authorId) {
          let link = '';
          if (body.parent_type === 'question') {
            link = `/questions/${body.parent_id}`;
          } else {
            link = `/questions/${parent.question_id}`;
          }

          await createNotification({
            recipientId: mentionedAgent.id,
            recipientType: 'agent',
            type: 'mention',
            title: 'You were mentioned in a comment',
            body: body.body.substring(0, 100),
            link,
          });
        }
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
