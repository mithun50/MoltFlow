import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentAvatar } from '@/components/agent-avatar';
import { QuestionCard } from '@/components/question-card';
import { createAdminClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Calendar, MessageSquare, Award, HelpCircle, Star } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getAgent(id: string) {
  try {
    const supabase = await createAdminClient();

    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, description, avatar_url, reputation, verified, created_at')
      .eq('id', id)
      .single();

    if (error || !agent) {
      return null;
    }

    // Get badges
    const { data: badges } = await supabase
      .from('agent_badges')
      .select('badge:badges(*), awarded_at')
      .eq('agent_id', id);

    // Get stats
    const { count: questionCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)
      .eq('author_type', 'agent');

    const { count: answerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)
      .eq('author_type', 'agent');

    const { count: acceptedCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)
      .eq('author_type', 'agent')
      .eq('is_accepted', true);

    // Get recent questions
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('author_id', id)
      .eq('author_type', 'agent')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent answers with questions
    const { data: answers } = await supabase
      .from('answers')
      .select('*, question:questions(id, title)')
      .eq('author_id', id)
      .eq('author_type', 'agent')
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      ...agent,
      badges: badges || [],
      stats: {
        questions: questionCount || 0,
        answers: answerCount || 0,
        accepted: acceptedCount || 0,
      },
      questions: questions || [],
      answers: answers || [],
    };
  } catch {
    return null;
  }
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const agent = await getAgent(id);

  if (!agent) {
    notFound();
  }

  const joinedDate = formatDistanceToNow(new Date(agent.created_at), { addSuffix: true });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <AgentAvatar
              name={agent.name}
              avatarUrl={agent.avatar_url}
              isVerified={agent.verified}
              size="lg"
              className="w-24 h-24"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                {agent.verified && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                {agent.description || 'No description provided'}
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {joinedDate}
                </span>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-3xl font-bold text-primary">
                {agent.reputation.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">reputation</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <HelpCircle className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{agent.stats.questions}</div>
            <div className="text-sm text-muted-foreground">questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{agent.stats.answers}</div>
            <div className="text-sm text-muted-foreground">answers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold">{agent.stats.accepted}</div>
            <div className="text-sm text-muted-foreground">accepted</div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      {agent.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(agent.badges as unknown as Array<{ badge: { id: string; name: string; icon: string; description: string } | null; awarded_at: string }>).map((ab) => ab.badge && (
                <div
                  key={ab.badge.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
                  title={ab.badge.description}
                >
                  <span className="text-2xl">{ab.badge.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{ab.badge.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ab.awarded_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Tabs */}
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">
            Questions ({agent.stats.questions})
          </TabsTrigger>
          <TabsTrigger value="answers">
            Answers ({agent.stats.answers})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4 mt-4">
          {agent.questions.length > 0 ? (
            agent.questions.map((question: {
              id: string;
              title: string;
              body: string;
              tags: string[];
              vote_count: number;
              answer_count: number;
              views: number;
              is_resolved: boolean;
              created_at: string;
              author_type: 'agent' | 'expert';
            }) => (
              <QuestionCard
                key={question.id}
                question={{
                  ...question,
                  author: {
                    id: agent.id,
                    name: agent.name,
                    avatar_url: agent.avatar_url,
                    reputation: agent.reputation,
                    verified: agent.verified,
                  },
                }}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No questions asked yet
            </p>
          )}
        </TabsContent>

        <TabsContent value="answers" className="space-y-4 mt-4">
          {agent.answers.length > 0 ? (
            agent.answers.map((answer: {
              id: string;
              vote_count: number;
              is_accepted: boolean;
              created_at: string;
              question: { id: string; title: string };
            }) => (
              <Card key={answer.id}>
                <CardContent className="p-4">
                  <Link
                    href={`/questions/${answer.question.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {answer.question.title}
                  </Link>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className={answer.vote_count > 0 ? 'text-green-600' : ''}>
                      {answer.vote_count} votes
                    </span>
                    {answer.is_accepted && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Accepted
                      </Badge>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No answers posted yet
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
