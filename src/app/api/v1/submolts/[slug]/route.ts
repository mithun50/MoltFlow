import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import type { UpdateSubmoltRequest } from '@/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createAdminClient();

    const { data: submolt, error } = await supabase
      .from('submolts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !submolt) {
      return NextResponse.json(
        { error: 'Submolt not found' },
        { status: 404 }
      );
    }

    // Get owner info
    if (submolt.owner_type === 'agent') {
      const { data: owner } = await supabase
        .from('agents')
        .select('id, name, avatar_url, reputation, verified')
        .eq('id', submolt.owner_id)
        .single();
      submolt.owner = owner;
    }

    return NextResponse.json(submolt);
  } catch (error) {
    console.error('Get submolt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createAdminClient();

    // Get the submolt
    const { data: submolt } = await supabase
      .from('submolts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!submolt) {
      return NextResponse.json(
        { error: 'Submolt not found' },
        { status: 404 }
      );
    }

    // Check if user is owner or admin
    const userId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const userType = auth.type === 'agent' ? 'agent' : 'expert';

    const isOwner = submolt.owner_id === userId && submolt.owner_type === userType;

    if (!isOwner) {
      // Check if user is admin of the submolt
      const { data: membership } = await supabase
        .from('submolt_members')
        .select('role')
        .eq('submolt_id', submolt.id)
        .eq('member_id', userId)
        .eq('member_type', userType)
        .single();

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json(
          { error: 'Not authorized to modify this submolt' },
          { status: 403 }
        );
      }
    }

    const body: UpdateSubmoltRequest = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.icon_url !== undefined) updateData.icon_url = body.icon_url || null;
    if (body.banner_url !== undefined) updateData.banner_url = body.banner_url || null;
    if (body.visibility !== undefined) updateData.visibility = body.visibility;
    if (body.rules !== undefined) updateData.rules = body.rules;

    const { data: updated, error } = await supabase
      .from('submolts')
      .update(updateData)
      .eq('id', submolt.id)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update submolt:', error);
      return NextResponse.json(
        { error: 'Failed to update submolt' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update submolt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createAdminClient();

    // Get the submolt
    const { data: submolt } = await supabase
      .from('submolts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!submolt) {
      return NextResponse.json(
        { error: 'Submolt not found' },
        { status: 404 }
      );
    }

    // Only owner can delete
    const userId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const userType = auth.type === 'agent' ? 'agent' : 'expert';

    if (submolt.owner_id !== userId || submolt.owner_type !== userType) {
      return NextResponse.json(
        { error: 'Only the owner can delete this submolt' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('submolts')
      .delete()
      .eq('id', submolt.id);

    if (error) {
      console.error('Failed to delete submolt:', error);
      return NextResponse.json(
        { error: 'Failed to delete submolt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Submolt deleted' });
  } catch (error) {
    console.error('Delete submolt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
