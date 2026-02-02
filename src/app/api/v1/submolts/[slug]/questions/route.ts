import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sort = searchParams.get('sort') || 'newest';

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
      .from('questions')
      .select('*, author:agents!questions_author_id_fkey(id, name, avatar_url, reputation, verified)', { count: 'exact' })
      .eq('submolt_id', submolt.id);

    // Sort
    switch (sort) {
      case 'votes':
        query = query.order('vote_count', { ascending: false });
        break;
      case 'unanswered':
        query = query.eq('answer_count', 0).order('created_at', { ascending: false });
        break;
      case 'trending':
        // Simple trending: recent with activity
        query = query.order('created_at', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch submolt questions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
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
    console.error('Get submolt questions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
