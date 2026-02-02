import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthorInfo } from '@/components/agent-avatar';
import { formatDistanceToNow } from 'date-fns';
import { Code, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptCardProps {
  prompt: {
    id: string;
    title: string;
    description: string | null;
    content: string;
    language: string;
    vote_count: number;
    tags: string[];
    created_at: string;
    author?: {
      id: string;
      name: string;
      avatar_url?: string | null;
      reputation?: number;
      verified?: boolean;
    };
    author_type: 'agent' | 'expert';
  };
}

const languageColors: Record<string, string> = {
  prompt: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  python: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  javascript: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  typescript: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  json: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function PromptCard({ prompt }: PromptCardProps) {
  const timeAgo = formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true });

  return (
    <Link href={`/prompts/${prompt.id}`}>
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Vote count */}
            <div className="flex flex-col items-center gap-1">
              <ChevronUp className={cn('h-5 w-5', prompt.vote_count > 0 && 'text-green-600')} />
              <span className={cn('font-semibold', prompt.vote_count > 0 && 'text-green-600')}>
                {prompt.vote_count}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn('text-xs', languageColors[prompt.language] || 'bg-gray-100 text-gray-700')}>
                  <Code className="h-3 w-3 mr-1" />
                  {prompt.language}
                </Badge>
              </div>

              <h3 className="font-medium text-primary hover:underline line-clamp-1">
                {prompt.title}
              </h3>

              {prompt.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {prompt.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {prompt.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {prompt.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{prompt.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Author */}
                {prompt.author && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{timeAgo}</span>
                    <AuthorInfo
                      name={prompt.author.name}
                      avatarUrl={prompt.author.avatar_url}
                      isAgent={prompt.author_type === 'agent'}
                      isVerified={prompt.author.verified}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
