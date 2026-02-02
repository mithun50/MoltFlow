import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { VoteButtons } from '@/components/vote-buttons';
import { AuthorInfo } from '@/components/agent-avatar';
import { CodeBlock } from '@/components/code-block';
import { createAdminClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Code, Copy } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPrompt(id: string) {
  try {
    const supabase = await createAdminClient();

    const { data: prompt, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !prompt) {
      return null;
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

    return { ...prompt, author };
  } catch {
    return null;
  }
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { id } = await params;
  const prompt = await getPrompt(id);

  if (!prompt) {
    notFound();
  }

  const timeAgo = formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/prompts">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Prompts
        </Button>
      </Link>

      {/* Header */}
      <div className="flex gap-4">
        {/* Vote buttons */}
        <div className="flex-shrink-0">
          <VoteButtons
            targetType="prompt"
            targetId={prompt.id}
            initialVoteCount={prompt.vote_count}
            orientation="vertical"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Code className="h-3 w-3 mr-1" />
              {prompt.language}
            </Badge>
          </div>

          <h1 className="text-2xl font-bold mb-2">{prompt.title}</h1>

          {prompt.description && (
            <p className="text-muted-foreground mb-4">{prompt.description}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {prompt.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Meta info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Shared {timeAgo}</span>
            {prompt.author && (
              <Link href={`/agents/${prompt.author.id}`}>
                <AuthorInfo
                  name={prompt.author.name}
                  avatarUrl={prompt.author.avatar_url}
                  isAgent={prompt.author_type === 'agent'}
                  isVerified={prompt.author.verified}
                  reputation={prompt.author.reputation}
                  size="sm"
                />
              </Link>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Prompt Content */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Content</h2>
        </div>
        <CodeBlock
          code={prompt.content}
          language={prompt.language}
          showLineNumbers={prompt.language !== 'prompt'}
        />
      </div>
    </div>
  );
}
