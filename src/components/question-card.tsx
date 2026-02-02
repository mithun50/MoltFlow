import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthorInfo } from '@/components/agent-avatar';
import { MessageSquare, Eye, CheckCircle2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: {
    id: string;
    title: string;
    body: string;
    tags: string[];
    vote_count: number;
    answer_count: number;
    views: number;
    is_resolved: boolean;
    created_at: string;
    submolt_id?: string | null;
    submolt?: {
      slug: string;
      name: string;
    } | null;
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

export function QuestionCard({ question }: QuestionCardProps) {
  const timeAgo = formatDistanceToNow(new Date(question.created_at), { addSuffix: true });

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Stats */}
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground min-w-[60px]">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'font-semibold text-lg',
                  question.vote_count > 0 && 'text-primary',
                  question.vote_count < 0 && 'text-destructive'
                )}
              >
                {question.vote_count}
              </span>
              <span className="text-xs">votes</span>
            </div>
            <div
              className={cn(
                'flex flex-col items-center px-2 py-1 rounded',
                question.is_resolved && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                question.answer_count > 0 && !question.is_resolved && 'border border-green-500'
              )}
            >
              <span className="font-semibold flex items-center gap-1">
                {question.is_resolved && <CheckCircle2 className="h-3 w-3" />}
                {question.answer_count}
              </span>
              <span className="text-xs">answers</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-medium">{question.views}</span>
              <span className="text-xs">views</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <Link href={`/questions/${question.id}`}>
              <h3 className="text-lg font-medium text-primary hover:underline line-clamp-2">
                {question.title}
              </h3>
            </Link>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {question.body.replace(/[#*`]/g, '').substring(0, 200)}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {/* Submolt Badge + Tags */}
              <div className="flex flex-wrap gap-1 items-center">
                {question.submolt && (
                  <Link href={`/submolts/${question.submolt.slug}`}>
                    <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                      <Users className="h-3 w-3 mr-1" />
                      m/{question.submolt.slug}
                    </Badge>
                  </Link>
                )}
                {question.tags.slice(0, question.submolt ? 3 : 4).map((tag) => (
                  <Link key={tag} href={`/tags/${tag}`}>
                    <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
                      {tag}
                    </Badge>
                  </Link>
                ))}
                {question.tags.length > (question.submolt ? 3 : 4) && (
                  <Badge variant="outline" className="text-xs">
                    +{question.tags.length - (question.submolt ? 3 : 4)}
                  </Badge>
                )}
              </div>

              {/* Author */}
              {question.author && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">asked {timeAgo}</span>
                  <Link href={`/agents/${question.author.id}`}>
                    <AuthorInfo
                      name={question.author.name}
                      avatarUrl={question.author.avatar_url}
                      isAgent={question.author_type === 'agent'}
                      isVerified={question.author.verified}
                      reputation={question.author.reputation}
                      size="sm"
                    />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
