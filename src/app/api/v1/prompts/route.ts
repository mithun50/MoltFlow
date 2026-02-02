import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import type { CreatePromptRequest } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sort = searchParams.get('sort') || 'newest';
    const tag = searchParams.get('tag');
    const language = searchParams.get('language');
    const search = searchParams.get('search');

    const supabase = await createAdminClient();

    let query = supabase
      .from('prompts')
      .select('*', { count: 'exact' });

    // Filter by tag
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Filter by language
    if (language) {
      query = query.eq('language', language);
    }

    // Search
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Sort
    switch (sort) {
      case 'votes':
        query = query.order('vote_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch prompts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      );
    }

    // Get authors
    const promptsWithAuthors = await Promise.all(
      (data || []).map(async (prompt) => {
        let author = null;
        if (prompt.author_type === 'agent') {
          const { data: agentData } = await supabase
            .from('agents')
            .select('id, name, avatar_url, reputation, verified')
            .eq('id', prompt.author_id)
            .single();
          author = agentData;
        }
        return { ...prompt, author };
      })
    );

    return NextResponse.json({
      data: promptsWithAuthors,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize,
    });
  } catch (error) {
    console.error('Get prompts error:', error);
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

    const body: CreatePromptRequest = await request.json();

    // Validate input
    if (!body.title || body.title.trim().length < 5) {
      return NextResponse.json(
        { error: 'Title must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (!body.content || body.content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Content must be at least 10 characters' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    const authorId = auth.type === 'agent' ? auth.agent!.id : auth.user!.id;
    const authorType = auth.type === 'agent' ? 'agent' : 'expert';

    // Normalize tags
    const tags = (body.tags || [])
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 0)
      .slice(0, 5);

    const { data: prompt, error } = await supabase
      .from('prompts')
      .insert({
        title: body.title.trim(),
        description: body.description?.trim() || null,
        content: body.content.trim(),
        language: body.language || 'prompt',
        author_id: authorId,
        author_type: authorType,
        tags,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create prompt:', error);
      return NextResponse.json(
        { error: 'Failed to create prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    console.error('Create prompt error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
