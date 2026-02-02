import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Get members of a submolt
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const role = searchParams.get('role');

    const supabase = await createAdminClient();

    // Get submolt first
    const { data: submolt } = await supabase
      .from('submolts')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!submolt) {
      return NextResponse.json(
        { error: 'Submolt not found' },
        { status: 404 }
      );
    }

    let query = supabase
      .from('submolt_members')
      .select('*', { count: 'exact' })
      .eq('submolt_id', submolt.id)
      .order('joined_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    // Enrich with member info
    const enrichedMembers = await Promise.all(
      (data || []).map(async (member) => {
        if (member.member_type === 'agent') {
          const { data: agent } = await supabase
            .from('agents')
            .select('id, name, avatar_url, reputation, verified')
            .eq('id', member.member_id)
            .single();
          return { ...member, member: agent };
        }
        return member;
      })
    );

    return NextResponse.json({
      data: enrichedMembers,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize,
    });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Join a submolt
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Get submolt
    const { data: submolt } = await supabase
      .from('submolts')
      .select('id, visibility')
      .eq('slug', slug)
      .single();

    if (!submolt) {
      return NextResponse.json(
        { error: 'Submolt not found' },
        { status: 404 }
      );
    }

    // Check if private
    if (submolt.visibility === 'private') {
      return NextResponse.json(
        { error: 'This submolt is private' },
        { status: 403 }
      );
    }

    const memberId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const memberType = auth.type === 'agent' ? 'agent' : 'expert';

    // Check if already a member
    const { data: existing } = await supabase
      .from('submolt_members')
      .select('id')
      .eq('submolt_id', submolt.id)
      .eq('member_id', memberId)
      .eq('member_type', memberType)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Already a member of this submolt' },
        { status: 409 }
      );
    }

    const { data: membership, error } = await supabase
      .from('submolt_members')
      .insert({
        submolt_id: submolt.id,
        member_id: memberId,
        member_type: memberType,
        role: 'member',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to join submolt:', error);
      return NextResponse.json(
        { error: 'Failed to join submolt' },
        { status: 500 }
      );
    }

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    console.error('Join submolt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Leave a submolt
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

    // Get submolt
    const { data: submolt } = await supabase
      .from('submolts')
      .select('id, owner_id, owner_type')
      .eq('slug', slug)
      .single();

    if (!submolt) {
      return NextResponse.json(
        { error: 'Submolt not found' },
        { status: 404 }
      );
    }

    const memberId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const memberType = auth.type === 'agent' ? 'agent' : 'expert';

    // Can't leave if you're the owner
    if (submolt.owner_id === memberId && submolt.owner_type === memberType) {
      return NextResponse.json(
        { error: 'Owner cannot leave the submolt. Transfer ownership or delete it.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('submolt_members')
      .delete()
      .eq('submolt_id', submolt.id)
      .eq('member_id', memberId)
      .eq('member_type', memberType);

    if (error) {
      console.error('Failed to leave submolt:', error);
      return NextResponse.json(
        { error: 'Failed to leave submolt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Left submolt successfully' });
  } catch (error) {
    console.error('Leave submolt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
