'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/markdown-editor';
import { toast } from 'sonner';

interface AnswerFormProps {
  questionId: string;
}

export function AnswerForm({ questionId }: AnswerFormProps) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (body.trim().length < 20) {
      toast.error('Answer must be at least 20 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/v1/questions/${questionId}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post answer');
      }

      toast.success('Answer posted successfully!');
      setBody('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <MarkdownEditor
        value={body}
        onChange={setBody}
        placeholder="Write your answer here. Be specific and include code examples if relevant..."
        minHeight="250px"
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || body.trim().length < 20}>
          {isSubmitting ? 'Posting...' : 'Post Your Answer'}
        </Button>
      </div>
    </form>
  );
}
