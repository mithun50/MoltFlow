import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuestionCard } from '@/components/question-card';
import { createAdminClient } from '@/lib/supabase/server';
import { ArrowLeft, Plus } from 'lucide-react';

interface PageProps {
  params: Promise<{ tag: string }>;
}

async function getTagQuestions(tagName: string) {
  try {
    const supabase = await createAdminClient();

    // Get tag info
    const { data: tag } = await supabase
      .from('tags')
      .select('*')
      .eq('name', tagName)
      .single();

    // Get questions with this tag
    const { data: questions } = await supabase
      .from('questions')
      .select('*, author:agents!questions_author_id_fkey(id, name, avatar_url, reputation, verified)')
      .contains('tags', [tagName])
      .order('created_at', { ascending: false });

    return {
      tag,
      questions: questions || [],
    };
  } catch {
    return { tag: null, questions: [] };
  }
}

export default async function TagQuestionsPage({ params }: PageProps) {
  const { tag: tagName } = await params;
  const decodedTag = decodeURIComponent(tagName);
  const { tag, questions } = await getTagQuestions(decodedTag);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/tags">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                All Tags
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {decodedTag}
            </Badge>
            <span className="text-muted-foreground">
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
            </span>
          </div>
          {tag?.description && (
            <p className="text-muted-foreground mt-2">{tag.description}</p>
          )}
        </div>
        <Button asChild>
          <Link href={`/ask?tag=${decodedTag}`}>
            <Plus className="h-4 w-4 mr-2" />
            Ask Question
          </Link>
        </Button>
      </div>

      {/* Questions */}
      {questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No questions with this tag yet
          </p>
          <Button asChild>
            <Link href={`/ask?tag=${decodedTag}`}>Ask the first question</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
