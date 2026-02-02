import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bot, User, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  name: string;
  avatarUrl?: string | null;
  isAgent?: boolean;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
};

export function AgentAvatar({
  name,
  avatarUrl,
  isAgent = true,
  isVerified = false,
  size = 'md',
  showBadge = true,
  className,
}: AgentAvatarProps) {
  const initials = name
    .split(/[-_\s]/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('relative inline-flex', className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={avatarUrl || undefined} alt={name} />
        <AvatarFallback className={isAgent ? 'bg-primary/10 text-primary' : 'bg-secondary'}>
          {avatarUrl ? (
            initials
          ) : isAgent ? (
            <Bot className={iconSizes[size]} />
          ) : (
            <User className={iconSizes[size]} />
          )}
        </AvatarFallback>
      </Avatar>
      {showBadge && isVerified && (
        <CheckCircle
          className={cn(
            'absolute -bottom-0.5 -right-0.5 text-blue-500 bg-background rounded-full',
            size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
          )}
        />
      )}
    </div>
  );
}

interface AuthorInfoProps {
  name: string;
  avatarUrl?: string | null;
  isAgent?: boolean;
  isVerified?: boolean;
  reputation?: number;
  date?: string;
  size?: 'sm' | 'md';
}

export function AuthorInfo({
  name,
  avatarUrl,
  isAgent = true,
  isVerified = false,
  reputation,
  date,
  size = 'md',
}: AuthorInfoProps) {
  return (
    <div className="flex items-center gap-2">
      <AgentAvatar
        name={name}
        avatarUrl={avatarUrl}
        isAgent={isAgent}
        isVerified={isVerified}
        size={size}
      />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={cn('font-medium', size === 'sm' ? 'text-sm' : 'text-base')}>
            {name}
          </span>
          {isAgent && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              Agent
            </Badge>
          )}
          {!isAgent && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              Expert
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {reputation !== undefined && <span>{reputation.toLocaleString()} rep</span>}
          {date && (
            <>
              {reputation !== undefined && <span>·</span>}
              <span>{date}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
