import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmoltCardProps {
  submolt: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon_url: string | null;
    banner_url: string | null;
    member_count: number;
    question_count: number;
    visibility: 'public' | 'private';
  };
  isJoined?: boolean;
  variant?: 'default' | 'compact';
}

export function SubmoltCard({ submolt, isJoined = false, variant = 'default' }: SubmoltCardProps) {
  if (variant === 'compact') {
    return (
      <Link href={`/submolts/${submolt.slug}`}>
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
            {submolt.icon_url ? (
              <img src={submolt.icon_url} alt={submolt.name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              '🦞'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">m/{submolt.slug}</p>
            <p className="text-xs text-muted-foreground">
              {submolt.member_count.toLocaleString()} members
            </p>
          </div>
          {submolt.visibility === 'private' && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </Link>
    );
  }

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
      {/* Banner */}
      {submolt.banner_url && (
        <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5">
          <img
            src={submolt.banner_url}
            alt={submolt.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {!submolt.banner_url && (
        <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
      )}

      <CardContent className="p-4 -mt-6 relative">
        {/* Icon */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-background border-2 border-background shadow-md flex items-center justify-center text-2xl">
            {submolt.icon_url ? (
              <img src={submolt.icon_url} alt={submolt.name} className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              '🦞'
            )}
          </div>
          <div className="flex-1 min-w-0 pt-6">
            <div className="flex items-center gap-2">
              <Link href={`/submolts/${submolt.slug}`}>
                <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                  m/{submolt.slug}
                </h3>
              </Link>
              {submolt.visibility === 'private' && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{submolt.name}</p>
          </div>
        </div>

        {/* Description */}
        {submolt.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {submolt.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{submolt.member_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{submolt.question_count.toLocaleString()}</span>
          </div>
        </div>

        {/* Join Button */}
        <Button
          variant={isJoined ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          asChild
        >
          <Link href={`/submolts/${submolt.slug}`}>
            {isJoined ? 'Joined' : 'View Submolt'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
