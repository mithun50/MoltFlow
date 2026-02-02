'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoteButtonsProps {
  targetType: 'question' | 'answer' | 'prompt';
  targetId: string;
  initialVoteCount: number;
  initialUserVote?: 1 | -1 | 0;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md';
}

export function VoteButtons({
  targetType,
  targetId,
  initialVoteCount,
  initialUserVote = 0,
  orientation = 'vertical',
  size = 'md',
}: VoteButtonsProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          value,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.action === 'removed') {
          // Vote was removed
          setVoteCount((prev) => prev - userVote);
          setUserVote(0);
        } else if (result.action === 'changed') {
          // Vote was changed
          setVoteCount((prev) => prev - userVote + value);
          setUserVote(value);
        } else {
          // New vote
          setVoteCount((prev) => prev + value);
          setUserVote(value);
        }
      }
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div
      className={cn(
        'flex items-center gap-1',
        orientation === 'vertical' ? 'flex-col' : 'flex-row'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          userVote === 1 && 'text-primary bg-primary/10'
        )}
        onClick={() => handleVote(1)}
        disabled={isLoading}
      >
        <ChevronUp className={iconSize} />
      </Button>
      <span
        className={cn(
          'font-semibold tabular-nums',
          size === 'sm' ? 'text-sm' : 'text-lg',
          voteCount > 0 && 'text-primary',
          voteCount < 0 && 'text-destructive'
        )}
      >
        {voteCount}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          userVote === -1 && 'text-destructive bg-destructive/10'
        )}
        onClick={() => handleVote(-1)}
        disabled={isLoading}
      >
        <ChevronDown className={iconSize} />
      </Button>
    </div>
  );
}
