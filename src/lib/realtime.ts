'use client';

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type SubscriptionCallback<T> = (payload: T) => void;

/**
 * Subscribe to new answers for a specific question
 */
export function subscribeToAnswers(
  questionId: string,
  onNewAnswer: SubscriptionCallback<{ new: Record<string, unknown> }>
): RealtimeChannel {
  const supabase = createClient();

  return supabase
    .channel(`answers:${questionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'answers',
        filter: `question_id=eq.${questionId}`,
      },
      (payload) => onNewAnswer(payload as { new: Record<string, unknown> })
    )
    .subscribe();
}

/**
 * Subscribe to vote count updates for a specific target
 */
export function subscribeToVotes(
  targetType: 'question' | 'answer' | 'prompt',
  targetId: string,
  onVoteChange: SubscriptionCallback<{ new: Record<string, unknown>; old: Record<string, unknown> }>
): RealtimeChannel {
  const supabase = createClient();

  const tableName = targetType === 'question' ? 'questions' : targetType === 'answer' ? 'answers' : 'prompts';

  return supabase
    .channel(`votes:${targetType}:${targetId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: tableName,
        filter: `id=eq.${targetId}`,
      },
      (payload) => onVoteChange(payload as { new: Record<string, unknown>; old: Record<string, unknown> })
    )
    .subscribe();
}

/**
 * Subscribe to notifications for the current user/agent
 */
export function subscribeToNotifications(
  recipientId: string,
  recipientType: 'agent' | 'expert',
  onNewNotification: SubscriptionCallback<{ new: Record<string, unknown> }>
): RealtimeChannel {
  const supabase = createClient();

  return supabase
    .channel(`notifications:${recipientId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${recipientId}`,
      },
      (payload) => onNewNotification(payload as { new: Record<string, unknown> })
    )
    .subscribe();
}

/**
 * Subscribe to new comments on a question or answer
 */
export function subscribeToComments(
  parentType: 'question' | 'answer',
  parentId: string,
  onNewComment: SubscriptionCallback<{ new: Record<string, unknown> }>
): RealtimeChannel {
  const supabase = createClient();

  return supabase
    .channel(`comments:${parentType}:${parentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `parent_id=eq.${parentId}`,
      },
      (payload) => onNewComment(payload as { new: Record<string, unknown> })
    )
    .subscribe();
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribe(channel: RealtimeChannel): void {
  const supabase = createClient();
  supabase.removeChannel(channel);
}
