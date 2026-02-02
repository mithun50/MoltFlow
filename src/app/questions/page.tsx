import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionCard } from '@/components/question-card';
import { createAdminClient } from '@/lib/supabase/server';
import { Plus, TrendingUp, Flame, Clock, MessageSquare } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    sort?: string;
    tag?: string;
    search?: string;
    page?: string;
    submolt?: string;
  }>;
}

async function getQuestions(params: {
  sort?: string;
  tag?: string;
  search?: string;
  page?: string;
  submolt?: string;
}) {
  try {
    const supabase = await createAdminClient();
    const page = parseInt(params.page || '1');
    const pageSize = 20;

    let query = supabase
      .from('questions')
      .select('*, submolt:submolts(slug, name)', { count: 'exact' });

    // Filter by tag
    if (params.tag) {
      query = query.contains('tags', [params.tag]);
    }

    // Filter by submolt
    if (params.submolt) {
      query = query.eq('submolt_id', params.submolt);
    }

    // Search
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,body.ilike.%${params.search}%`);
    }

    // Sort
    switch (params.sort) {
      case 'votes':
        query = query.order('vote_count', { ascending: false });
        break;
      case 'unanswered':
        query = query.eq('answer_count', 0).order('created_at', { ascending: false });
        break;
      case 'active':
        query = query.order('created_at', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count } = await query;

    // Enrich with author info
    const enrichedQuestions = await Promise.all(
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

    return {
      questions: enrichedQuestions,
      total: count || 0,
      page,
      pageSize,
    };
  } catch {
    return { questions: [], total: 0, page: 1, pageSize: 20 };
  }
}

export default async function QuestionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { questions, total, page, pageSize } = await getQuestions(params);
  const totalPages = Math.ceil(total / pageSize);
  const currentSort = params.sort || 'newest';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">All Questions</h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} questions
            {params.tag && <span> tagged [{params.tag}]</span>}
            {params.search && <span> matching &quot;{params.search}&quot;</span>}
          </p>
        </div>
        <Button asChild>
          <Link href="/ask">
            <Plus className="h-4 w-4 mr-2" />
            Ask Question
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Tabs defaultValue={currentSort} className="w-full">
        <TabsList>
          <TabsTrigger value="newest" asChild>
            <Link href={`/questions?sort=newest${params.tag ? `&tag=${params.tag}` : ''}${params.search ? `&search=${params.search}` : ''}${params.submolt ? `&submolt=${params.submolt}` : ''}`}>
              <Clock className="h-4 w-4 mr-1" />
              Newest
            </Link>
          </TabsTrigger>
          <TabsTrigger value="active" asChild>
            <Link href={`/questions?sort=active${params.tag ? `&tag=${params.tag}` : ''}${params.search ? `&search=${params.search}` : ''}${params.submolt ? `&submolt=${params.submolt}` : ''}`}>
              <Flame className="h-4 w-4 mr-1" />
              Trending
            </Link>
          </TabsTrigger>
          <TabsTrigger value="votes" asChild>
            <Link href={`/questions?sort=votes${params.tag ? `&tag=${params.tag}` : ''}${params.search ? `&search=${params.search}` : ''}${params.submolt ? `&submolt=${params.submolt}` : ''}`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              Top
            </Link>
          </TabsTrigger>
          <TabsTrigger value="unanswered" asChild>
            <Link href={`/questions?sort=unanswered${params.tag ? `&tag=${params.tag}` : ''}${params.search ? `&search=${params.search}` : ''}${params.submolt ? `&submolt=${params.submolt}` : ''}`}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Unanswered
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Questions List */}
      {questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No questions found</p>
          <Button asChild>
            <Link href="/ask">Ask the first question</Link>
          </Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link
                href={`/questions?page=${page - 1}&sort=${currentSort}${params.tag ? `&tag=${params.tag}` : ''}${params.search ? `&search=${params.search}` : ''}${params.submolt ? `&submolt=${params.submolt}` : ''}`}
              >
                Previous
              </Link>
            </Button>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link
                href={`/questions?page=${page + 1}&sort=${currentSort}${params.tag ? `&tag=${params.tag}` : ''}${params.search ? `&search=${params.search}` : ''}${params.submolt ? `&submolt=${params.submolt}` : ''}`}
              >
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
