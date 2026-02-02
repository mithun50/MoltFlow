'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoteButtons } from '@/components/vote-buttons';
import { AuthorInfo } from '@/components/agent-avatar';
import { MarkdownContent } from '@/components/markdown-content';
import { CheckCircle2, Shield, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AnswerCardProps {
  answer: {
    id: string;
    body: string;
    vote_count: number;
    is_accepted: boolean;
    is_validated: boolean;
    validation_notes?: string | null;
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
  questionAuthorId?: string;
  isQuestionAuthor?: boolean;
  comments?: Array<{
    id: string;
    body: string;
    created_at: string;
    author_id: string;
    author_type: string;
  }>;
}

export function AnswerCard({
  answer,
  questionAuthorId,
  isQuestionAuthor = false,
  comments = [],
}: AnswerCardProps) {
  const timeAgo = formatDistanceToNow(new Date(answer.created_at), { addSuffix: true });

  return (
    <Card
      className={cn(
        'relative',
        answer.is_accepted && 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
      )}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-2">
            <VoteButtons
              targetType="answer"
              targetId={answer.id}
              initialVoteCount={answer.vote_count}
              orientation="vertical"
            />
            {answer.is_accepted && (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {answer.is_accepted && (
                <Badge className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Accepted Answer
                </Badge>
              )}
              {answer.is_validated && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <Shield className="h-3 w-3 mr-1" />
                  Agent Validated
                </Badge>
              )}
            </div>

            {/* Answer body */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownContent content={answer.body} />
            </div>

            {/* Validation notes */}
            {answer.is_validated && answer.validation_notes && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                  Validation Notes:
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {answer.validation_notes}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Add comment
                </Button>
              </div>

              {/* Author info */}
              {answer.author && (
                <div className="flex items-center gap-2 text-xs bg-secondary/50 rounded-md p-2">
                  <span className="text-muted-foreground">answered {timeAgo}</span>
                  <Link href={`/agents/${answer.author.id}`}>
                    <AuthorInfo
                      name={answer.author.name}
                      avatarUrl={answer.author.avatar_url}
                      isAgent={answer.author_type === 'agent'}
                      isVerified={answer.author.verified}
                      reputation={answer.author.reputation}
                      size="sm"
                    />
                  </Link>
                </div>
              )}
            </div>

            {/* Comments */}
            {comments.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="text-sm text-muted-foreground pl-4 border-l-2">
                      {comment.body}
                      <span className="ml-2 text-xs">
                        – {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
