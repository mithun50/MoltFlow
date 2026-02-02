import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/auth';
import { checkAndAwardBadges, createNotification } from '@/lib/reputation';
import type { CreateQuestionRequest } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sort = searchParams.get('sort') || 'newest';
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const authorId = searchParams.get('author');
    const submoltId = searchParams.get('submolt');

    const supabase = await createAdminClient();

    // Fetch questions first
    let query = supabase
      .from('questions')
      .select('*, submolt:submolts(slug, name)', { count: 'exact' });

    // Filter by tag
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Filter by author
    if (authorId) {
      query = query.eq('author_id', authorId);
    }

    // Filter by submolt
    if (submoltId) {
      query = query.eq('submolt_id', submoltId);
    }

    // Search in title and body
    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    }

    // Sort
    switch (sort) {
      case 'votes':
        query = query.order('vote_count', { ascending: false });
        break;
      case 'unanswered':
        query = query.eq('answer_count', 0).order('created_at', { ascending: false });
        break;
      case 'active':
        query = query.order('created_at', { ascending: false }); // TODO: track last activity
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
      console.error('Failed to fetch questions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    // Enrich with author info
    const enrichedData = await Promise.all(
      (data || []).map(async (question) => {
        if (question.author_type === 'agent') {
          const { data: author } = await supabase
            .from('agents')
            .select('id, name, avatar_url, reputation, verified')
            .eq('id', question.author_id)
            .single();
          return { ...question, author };
        }
        return question;
      })
    );

    return NextResponse.json({
      data: enrichedData,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > page * pageSize,
    });
  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    const body: CreateQuestionRequest = await request.json();

    // Validate input
    if (!body.title || body.title.trim().length < 10) {
      return NextResponse.json(
        { error: 'Title must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!body.body || body.body.trim().length < 20) {
      return NextResponse.json(
        { error: 'Question body must be at least 20 characters' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    let authorId: string;
    let authorType: 'agent' | 'expert';

    if (auth.type === 'agent') {
      authorId = auth.agent!.id;
      authorType = 'agent';
    } else if (auth.type === 'user') {
      authorId = auth.user!.id;
      authorType = 'expert';
    } else {
      // Guest mode: create or get a guest agent for web users
      const { data: guestAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('name', 'Guest')
        .single();

      if (guestAgent) {
        authorId = guestAgent.id;
      } else {
        // Create guest agent if doesn't exist
        const { data: newGuest, error: guestError } = await supabase
          .from('agents')
          .insert({
            name: 'Guest',
            description: 'Anonymous web user',
            api_key_hash: 'guest-no-api-key',
            reputation: 0,
            verified: false,
          })
          .select('id')
          .single();

        if (guestError || !newGuest) {
          return NextResponse.json(
            { error: 'Failed to create guest session' },
            { status: 500 }
          );
        }
        authorId = newGuest.id;
      }
      authorType = 'agent';
    }

    // Normalize tags
    const tags = (body.tags || [])
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 0)
      .slice(0, 5); // Max 5 tags

    // Validate submolt_id if provided
    let submoltId = null;
    if (body.submolt_id) {
      const { data: submolt } = await supabase
        .from('submolts')
        .select('id')
        .eq('id', body.submolt_id)
        .single();

      if (submolt) {
        submoltId = submolt.id;
      }
    }

    const { data: question, error } = await supabase
      .from('questions')
      .insert({
        title: body.title.trim(),
        body: body.body.trim(),
        author_id: authorId,
        author_type: authorType,
        tags,
        submolt_id: submoltId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create question:', error);
      return NextResponse.json(
        { error: 'Failed to create question' },
        { status: 500 }
      );
    }

    // Check for badge awards if author is an agent
    if (auth.type === 'agent') {
      const badges = await checkAndAwardBadges(authorId);
      if (badges.length > 0) {
        for (const badge of badges) {
          await createNotification({
            recipientId: authorId,
            recipientType: 'agent',
            type: 'badge',
            title: `You earned the "${badge}" badge!`,
            link: `/agents/${authorId}`,
          });
        }
      }
    }

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
