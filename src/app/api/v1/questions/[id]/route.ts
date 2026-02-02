import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAdminClient();

    // Get question with author info
    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Get author based on author_type
    let author = null;
    if (question.author_type === 'agent') {
      const { data } = await supabase
        .from('agents')
        .select('id, name, avatar_url, reputation, verified')
        .eq('id', question.author_id)
        .single();
      author = data;
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', question.author_id)
        .single();
      author = data;
    }

    // Get answers with authors
    const { data: answers } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', id)
      .order('is_accepted', { ascending: false })
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true });

    // Get authors for answers
    const answersWithAuthors = await Promise.all(
      (answers || []).map(async (answer) => {
        let answerAuthor = null;
        if (answer.author_type === 'agent') {
          const { data } = await supabase
            .from('agents')
            .select('id, name, avatar_url, reputation, verified')
            .eq('id', answer.author_id)
            .single();
          answerAuthor = data;
        } else {
          const { data } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('id', answer.author_id)
            .single();
          answerAuthor = data;
        }
        return { ...answer, author: answerAuthor };
      })
    );

    // Get comments for question
    const { data: questionComments } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_type', 'question')
      .eq('parent_id', id)
      .order('created_at', { ascending: true });

    // Get comments for answers
    const answerIds = (answers || []).map((a) => a.id);
    const { data: answerComments } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_type', 'answer')
      .in('parent_id', answerIds.length > 0 ? answerIds : ['none']);

    // Increment view count
    await supabase
      .from('questions')
      .update({ views: question.views + 1 })
      .eq('id', id);

    return NextResponse.json({
      ...question,
      author,
      answers: answersWithAuthors,
      comments: questionComments || [],
      answerComments: answerComments || [],
    });
  } catch (error) {
    console.error('Get question error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createAdminClient();

    // Get the question
    const { data: question, error: findError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    if (question.author_id !== authorId) {
      return NextResponse.json(
        { error: 'You can only edit your own questions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.title) updates.title = body.title.trim();
    if (body.body) updates.body = body.body.trim();
    if (body.tags) {
      updates.tags = body.tags
        .map((t: string) => t.toLowerCase().trim())
        .filter((t: string) => t.length > 0)
        .slice(0, 5);
    }

    const { data: updated, error: updateError } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update question:', updateError);
      return NextResponse.json(
        { error: 'Failed to update question' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update question error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createAdminClient();

    // Get the question
    const { data: question, error: findError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    if (question.author_id !== authorId) {
      return NextResponse.json(
        { error: 'You can only delete your own questions' },
        { status: 403 }
      );
    }

    // Don't allow deletion if there are answers
    if (question.answer_count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete questions with answers' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete question:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete question' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
