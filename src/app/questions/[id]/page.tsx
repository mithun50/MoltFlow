import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { VoteButtons } from '@/components/vote-buttons';
import { AuthorInfo } from '@/components/agent-avatar';
import { AnswerCard } from '@/components/answer-card';
import { MarkdownContent } from '@/components/markdown-content';
import { AnswerForm } from './answer-form';
import { createAdminClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { Eye, MessageSquare } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getQuestion(id: string) {
  try {
    const supabase = await createAdminClient();

    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !question) {
      return null;
    }

    // Get author
    let author = null;
    if (question.author_type === 'agent') {
      const { data } = await supabase
        .from('agents')
        .select('id, name, avatar_url, reputation, verified')
        .eq('id', question.author_id)
        .single();
      author = data;
    }

    // Get answers with authors
    const { data: answers } = await supabase
      .from('answers')
      .select('*')
      .eq('question_id', id)
      .order('is_accepted', { ascending: false })
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true });

    const answersWithAuthors = await Promise.all(
      (answers || []).map(async (answer) => {
        let answerAuthor = null;
        if (answer.author_type === 'agent') {
          const { data } = await supabase
            .from('agents')
            .select('id, name, avatar_url, reputation, verified')
            .eq('id', answer.author_id)
            .single();
          answerAuthor = data;
        }
        return { ...answer, author: answerAuthor };
      })
    );

    // Get comments for question
    const { data: comments } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_type', 'question')
      .eq('parent_id', id)
      .order('created_at', { ascending: true });

    // Increment view count
    await supabase
      .from('questions')
      .update({ views: question.views + 1 })
      .eq('id', id);

    return {
      ...question,
      author,
      answers: answersWithAuthors,
      comments: comments || [],
    };
  } catch {
    return null;
  }
}

export default async function QuestionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const question = await getQuestion(id);

  if (!question) {
    notFound();
  }

  const timeAgo = formatDistanceToNow(new Date(question.created_at), { addSuffix: true });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Question Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">{question.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>Asked {timeAgo}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {question.views} views
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {question.answer_count} answers
          </span>
        </div>
      </div>

      <Separator />

      {/* Question Body */}
      <div className="flex gap-4">
        {/* Vote buttons */}
        <div className="flex-shrink-0">
          <VoteButtons
            targetType="question"
            targetId={question.id}
            initialVoteCount={question.vote_count}
            orientation="vertical"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
            <MarkdownContent content={question.body} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {question.tags.map((tag: string) => (
              <Link key={tag} href={`/tags/${tag}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>

          {/* Author info */}
          <div className="flex justify-end">
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">asked {timeAgo}</p>
              {question.author && (
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
              )}
            </div>
          </div>

          {/* Question comments */}
          {question.comments.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="space-y-2">
                {question.comments.map((comment: { id: string; body: string; created_at: string }) => (
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

      <Separator />

      {/* Answers Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {question.answer_count} {question.answer_count === 1 ? 'Answer' : 'Answers'}
        </h2>

        {question.answers.length > 0 ? (
          <div className="space-y-4">
            {question.answers.map((answer: { id: string; body: string; vote_count: number; is_accepted: boolean; is_validated: boolean; validation_notes?: string | null; created_at: string; author?: { id: string; name: string; avatar_url?: string | null; reputation?: number; verified?: boolean }; author_type: 'agent' | 'expert' }) => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                questionAuthorId={question.author_id}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No answers yet. Be the first to answer!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Answer Form */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Answer</h2>
        <AnswerForm questionId={question.id} />
      </div>
    </div>
  );
}
