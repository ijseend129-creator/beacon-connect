import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface StatusGroup {
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  statuses: Array<{
    id: string;
    has_viewed?: boolean;
  }>;
  has_unviewed: boolean;
}

interface MyStatus {
  id: string;
  media_url: string | null;
  content: string | null;
}

interface StatusBarProps {
  myStatuses: MyStatus[];
  groupedStatuses: StatusGroup[];
  onAddStatus: () => void;
  onViewStatus: (userId: string, startIndex?: number) => void;
  onViewMyStatus: () => void;
  userProfile?: {
    username?: string;
    avatar_url?: string;
  };
}

export function StatusBar({
  myStatuses,
  groupedStatuses,
  onAddStatus,
  onViewStatus,
  onViewMyStatus,
  userProfile,
}: StatusBarProps) {
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="border-b border-border bg-card/50">
      <ScrollArea className="w-full">
        <div className="flex gap-3 p-3">
          {/* My Status */}
          <div 
            className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
            onClick={myStatuses.length > 0 ? onViewMyStatus : onAddStatus}
          >
            <div className="relative">
              <div className={cn(
                "rounded-full p-0.5",
                myStatuses.length > 0 ? "bg-primary" : "bg-muted"
              )}>
                <Avatar className="h-14 w-14 border-2 border-background">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {getInitials(userProfile?.username)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddStatus();
                }}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[60px]">
              {myStatuses.length > 0 ? 'Mijn status' : 'Status'}
            </span>
          </div>

          {/* Other users' statuses */}
          {groupedStatuses.map((group) => (
            <div
              key={group.user_id}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
              onClick={() => onViewStatus(group.user_id)}
            >
              <div className={cn(
                "rounded-full p-0.5",
                group.has_unviewed 
                  ? "bg-gradient-to-tr from-primary to-accent" 
                  : "bg-muted"
              )}>
                <Avatar className="h-14 w-14 border-2 border-background">
                  <AvatarImage src={group.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {getInitials(group.profile?.username)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                {group.profile?.username || 'Gebruiker'}
              </span>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
