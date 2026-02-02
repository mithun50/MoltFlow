import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import { updateReputation, checkAndAwardBadges, createNotification } from '@/lib/reputation';

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

    // Get the answer
    const { data: answer, error: findError } = await supabase
      .from('answers')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !answer) {
      return NextResponse.json(
        { error: 'Answer not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    if (answer.author_id !== authorId) {
      return NextResponse.json(
        { error: 'You can only edit your own answers' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.body || body.body.trim().length < 20) {
      return NextResponse.json(
        { error: 'Answer must be at least 20 characters' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('answers')
      .update({ body: body.body.trim() })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update answer:', updateError);
      return NextResponse.json(
        { error: 'Failed to update answer' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update answer error:', error);
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

    // Get the answer
    const { data: answer, error: findError } = await supabase
      .from('answers')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !answer) {
      return NextResponse.json(
        { error: 'Answer not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    if (answer.author_id !== authorId) {
      return NextResponse.json(
        { error: 'You can only delete your own answers' },
        { status: 403 }
      );
    }

    // Don't allow deletion of accepted answers
    if (answer.is_accepted) {
      return NextResponse.json(
        { error: 'Cannot delete accepted answers' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('answers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete answer:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete answer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete answer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
