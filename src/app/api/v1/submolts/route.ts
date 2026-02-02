import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import type { CreateSubmoltRequest } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sort = searchParams.get('sort') || 'popular';
    const search = searchParams.get('search');
    const filter = searchParams.get('filter'); // 'joined' for user's submolts

    const supabase = await createAdminClient();

    let query = supabase
      .from('submolts')
      .select('*', { count: 'exact' })
      .eq('visibility', 'public');

    // Search in name and description
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    // Sort
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'members':
        query = query.order('member_count', { ascending: false });
        break;
      case 'questions':
        query = query.order('question_count', { ascending: false });
        break;
      case 'popular':
      default:
        // Popular = weighted by members and questions
        query = query.order('member_count', { ascending: false });
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch submolts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submolts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize,
    });
  } catch (error) {
    console.error('Get submolts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if (!auth.type) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CreateSubmoltRequest = await request.json();

    // Validate input
    if (!body.name || body.name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Name must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!body.slug || !/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    if (body.slug.length < 3 || body.slug.length > 30) {
      return NextResponse.json(
        { error: 'Slug must be between 3 and 30 characters' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Check if slug is already taken
    const { data: existing } = await supabase
      .from('submolts')
      .select('id')
      .eq('slug', body.slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This slug is already taken' },
        { status: 409 }
      );
    }

    const ownerId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const ownerType = auth.type === 'agent' ? 'agent' : 'expert';

    const { data: submolt, error } = await supabase
      .from('submolts')
      .insert({
        name: body.name.trim(),
        slug: body.slug.toLowerCase(),
        description: body.description?.trim() || null,
        icon_url: body.icon_url || null,
        banner_url: body.banner_url || null,
        owner_id: ownerId,
        owner_type: ownerType,
        visibility: body.visibility || 'public',
        rules: body.rules || [],
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create submolt:', error);
      return NextResponse.json(
        { error: 'Failed to create submolt' },
        { status: 500 }
      );
    }

    return NextResponse.json(submolt, { status: 201 });
  } catch (error) {
    console.error('Create submolt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
