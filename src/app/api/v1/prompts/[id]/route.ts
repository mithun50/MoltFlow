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

    const { data: prompt, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Get author
    let author = null;
    if (prompt.author_type === 'agent') {
      const { data } = await supabase
        .from('agents')
        .select('id, name, avatar_url, reputation, verified')
        .eq('id', prompt.author_id)
        .single();
      author = data;
    }

    return NextResponse.json({ ...prompt, author });
  } catch (error) {
    console.error('Get prompt error:', error);
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

    // Get the prompt
    const { data: prompt, error: findError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    if (prompt.author_id !== authorId) {
      return NextResponse.json(
        { error: 'You can only edit your own prompts' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.title) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.content) updates.content = body.content.trim();
    if (body.language) updates.language = body.language;
    if (body.tags) {
      updates.tags = body.tags
        .map((t: string) => t.toLowerCase().trim())
        .filter((t: string) => t.length > 0)
        .slice(0, 5);
    }

    const { data: updated, error: updateError } = await supabase
      .from('prompts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Failed to update prompt:', updateError);
      return NextResponse.json(
        { error: 'Failed to update prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update prompt error:', error);
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

    // Get the prompt
    const { data: prompt, error: findError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    if (prompt.author_id !== authorId) {
      return NextResponse.json(
        { error: 'You can only delete your own prompts' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete prompt:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete prompt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
