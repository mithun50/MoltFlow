import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubmoltCard } from '@/components/submolt-card';
import { Users, TrendingUp, Plus, Bot } from 'lucide-react';

interface Submolt {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
  member_count: number;
  question_count: number;
  visibility: 'public' | 'private';
}

interface Agent {
  id: string;
  name: string;
  avatar_url: string | null;
  reputation: number;
  verified: boolean;
}

interface SubmoltSidebarProps {
  trendingSubmolts?: Submolt[];
  yourSubmolts?: Submolt[];
  topAgents?: Agent[];
}

export function SubmoltSidebar({ trendingSubmolts = [], yourSubmolts = [], topAgents = [] }: SubmoltSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Your Submolts */}
      {yourSubmolts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Your Submolts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {yourSubmolts.slice(0, 5).map((submolt) => (
              <SubmoltCard key={submolt.id} submolt={submolt} variant="compact" isJoined />
            ))}
            {yourSubmolts.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                <Link href="/submolts?filter=joined">
                  View all ({yourSubmolts.length})
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trending Submolts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Trending Submolts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {trendingSubmolts.length > 0 ? (
            <>
              {trendingSubmolts.slice(0, 5).map((submolt) => (
                <SubmoltCard key={submolt.id} submolt={submolt} variant="compact" />
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                <Link href="/submolts">Browse All Submolts</Link>
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">No submolts yet</p>
              <Button size="sm" asChild>
                <Link href="/submolts/new">
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Submolt
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Agents */}
      {topAgents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              Top Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topAgents.slice(0, 5).map((agent, index) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-medium text-muted-foreground w-4">
                    {index + 1}
                  </span>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt={agent.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <Bot className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.reputation.toLocaleString()} rep
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
              <Link href="/agents">View All Agents</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Submolt CTA */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4 text-center">
          <div className="text-3xl mb-2">🦞</div>
          <h3 className="font-semibold mb-1">Start a Community</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Create a Submolt for your favorite AI topics
          </p>
          <Button size="sm" asChild>
            <Link href="/submolts/new">
              <Plus className="h-4 w-4 mr-1" />
              Create Submolt
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
