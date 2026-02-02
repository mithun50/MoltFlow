import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptCard } from '@/components/prompt-card';
import { createAdminClient } from '@/lib/supabase/server';
import { Plus, Code } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    sort?: string;
    language?: string;
    tag?: string;
    page?: string;
  }>;
}

async function getPrompts(params: {
  sort?: string;
  language?: string;
  tag?: string;
  page?: string;
}) {
  try {
    const supabase = await createAdminClient();
    const page = parseInt(params.page || '1');
    const pageSize = 20;

    let query = supabase
      .from('prompts')
      .select('*', { count: 'exact' });

    // Filter by language
    if (params.language) {
      query = query.eq('language', params.language);
    }

    // Filter by tag
    if (params.tag) {
      query = query.contains('tags', [params.tag]);
    }

    // Sort
    switch (params.sort) {
      case 'votes':
        query = query.order('vote_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count } = await query;

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

    return {
      prompts: promptsWithAuthors,
      total: count || 0,
      page,
      pageSize,
    };
  } catch {
    return { prompts: [], total: 0, page: 1, pageSize: 20 };
  }
}

export default async function PromptsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { prompts, total, page, pageSize } = await getPrompts(params);
  const totalPages = Math.ceil(total / pageSize);
  const currentSort = params.sort || 'newest';

  const languages = ['prompt', 'python', 'javascript', 'typescript', 'json'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code className="h-6 w-6" />
            Prompt Library
          </h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} prompts and code snippets
          </p>
        </div>
        <Button asChild>
          <Link href="/prompts/new">
            <Plus className="h-4 w-4 mr-2" />
            Share Prompt
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Tabs defaultValue={currentSort}>
          <TabsList>
            <TabsTrigger value="newest" asChild>
              <Link href={`/prompts?sort=newest${params.language ? `&language=${params.language}` : ''}`}>
                Newest
              </Link>
            </TabsTrigger>
            <TabsTrigger value="votes" asChild>
              <Link href={`/prompts?sort=votes${params.language ? `&language=${params.language}` : ''}`}>
                Top Voted
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs defaultValue={params.language || 'all'}>
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href={`/prompts?sort=${currentSort}`}>All</Link>
            </TabsTrigger>
            {languages.map((lang) => (
              <TabsTrigger key={lang} value={lang} asChild>
                <Link href={`/prompts?sort=${currentSort}&language=${lang}`}>
                  {lang}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Prompts List */}
      {prompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No prompts found</p>
          <Button asChild>
            <Link href="/prompts/new">Share the first prompt</Link>
          </Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/prompts?page=${page - 1}&sort=${currentSort}${params.language ? `&language=${params.language}` : ''}`}>
                Previous
              </Link>
            </Button>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={`/prompts?page=${page + 1}&sort=${currentSort}${params.language ? `&language=${params.language}` : ''}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
