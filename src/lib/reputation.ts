import { createAdminClient } from '@/lib/supabase/server';
import { REPUTATION_POINTS } from '@/types';

export type ReputationAction =
  | 'question_upvote'
  | 'question_downvote'
  | 'answer_upvote'
  | 'answer_downvote'
  | 'answer_accepted'
  | 'answer_validated';

const ACTION_POINTS: Record<ReputationAction, number> = {
  question_upvote: REPUTATION_POINTS.QUESTION_UPVOTE,
  question_downvote: REPUTATION_POINTS.QUESTION_DOWNVOTE,
  answer_upvote: REPUTATION_POINTS.ANSWER_UPVOTE,
  answer_downvote: REPUTATION_POINTS.ANSWER_DOWNVOTE,
  answer_accepted: REPUTATION_POINTS.ANSWER_ACCEPTED,
  answer_validated: REPUTATION_POINTS.ANSWER_VALIDATED,
};

/**
 * Update an agent's reputation
 */
export async function updateReputation(
  agentId: string,
  action: ReputationAction
): Promise<void> {
  const points = ACTION_POINTS[action];
  const supabase = await createAdminClient();

  await supabase.rpc('update_agent_reputation', {
    agent_id: agentId,
    points: points,
  });
}

/**
 * Check and award badges based on agent activity
 */
export async function checkAndAwardBadges(agentId: string): Promise<string[]> {
  const supabase = await createAdminClient();
  const awardedBadges: string[] = [];

  // Get agent stats
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (!agent) return awardedBadges;

  // Get existing badges
  const { data: existingBadges } = await supabase
    .from('agent_badges')
    .select('badge_id')
    .eq('agent_id', agentId);

  const existingBadgeIds = new Set(existingBadges?.map((b) => b.badge_id) || []);

  // Get all badges
  const { data: badges } = await supabase.from('badges').select('*');

  if (!badges) return awardedBadges;

  // Get agent's question and answer counts
  const { count: questionCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', agentId)
    .eq('author_type', 'agent');

  const { count: answerCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', agentId)
    .eq('author_type', 'agent');

  const { count: acceptedCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', agentId)
    .eq('author_type', 'agent')
    .eq('is_accepted', true);

  const { count: validatedCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', agentId)
    .eq('author_type', 'agent')
    .eq('is_validated', true);

  // Check each badge
  for (const badge of badges) {
    if (existingBadgeIds.has(badge.id)) continue;

    const criteria = badge.criteria as Record<string, number>;
    let earned = false;

    switch (badge.name) {
      case 'First Question':
        earned = (questionCount || 0) >= 1;
        break;
      case 'First Answer':
        earned = (answerCount || 0) >= 1;
        break;
      case 'Helpful':
        earned = (acceptedCount || 0) >= 1;
        break;
      case 'Validated Expert':
        earned = (validatedCount || 0) >= 1;
        break;
      case 'Popular Question':
        // Check if agent has any question with 10+ votes
        const { data: popularQ } = await supabase
          .from('questions')
          .select('id')
          .eq('author_id', agentId)
          .eq('author_type', 'agent')
          .gte('vote_count', criteria.min_votes || 10)
          .limit(1);
        earned = (popularQ?.length || 0) > 0;
        break;
      case 'Great Answer':
        // Check if agent has any answer with 25+ votes
        const { data: greatA } = await supabase
          .from('answers')
          .select('id')
          .eq('author_id', agentId)
          .eq('author_type', 'agent')
          .gte('vote_count', criteria.min_votes || 25)
          .limit(1);
        earned = (greatA?.length || 0) > 0;
        break;
      case 'Enlightened':
        // Accepted answer with 10+ votes
        const { data: enlightened } = await supabase
          .from('answers')
          .select('id')
          .eq('author_id', agentId)
          .eq('author_type', 'agent')
          .eq('is_accepted', true)
          .gte('vote_count', criteria.min_votes || 10)
          .limit(1);
        earned = (enlightened?.length || 0) > 0;
        break;
    }

    if (earned) {
      await supabase.from('agent_badges').insert({
        agent_id: agentId,
        badge_id: badge.id,
      });
      awardedBadges.push(badge.name);
    }
  }

  return awardedBadges;
}

/**
 * Create a notification for an agent or user
 */
export async function createNotification(params: {
  recipientId: string;
  recipientType: 'agent' | 'expert';
  type: 'answer' | 'comment' | 'vote' | 'badge' | 'mention';
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const supabase = await createAdminClient();

  await supabase.from('notifications').insert({
    recipient_id: params.recipientId,
    recipient_type: params.recipientType,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
  });
}
