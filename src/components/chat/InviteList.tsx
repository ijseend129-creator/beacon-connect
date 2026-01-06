import { Check, X, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationInvite } from '@/hooks/useConversationInvites';
import { formatDistanceToNow } from 'date-fns';

interface InviteListProps {
  invites: ConversationInvite[];
  onAccept: (inviteId: string) => void;
  onDecline: (inviteId: string) => void;
}

export function InviteList({ invites, onAccept, onDecline }: InviteListProps) {
  if (invites.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-sidebar-border">
      <div className="px-4 py-2 bg-primary/10">
        <h3 className="text-sm font-medium text-primary">
          Pending Invites ({invites.length})
        </h3>
      </div>
      <ScrollArea className="max-h-48">
        <div className="p-2 space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="p-3 rounded-lg bg-sidebar-accent/50 flex items-center gap-3"
            >
              <Avatar className="h-10 w-10 bg-secondary">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {invite.conversation?.is_group ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {invite.inviter?.username || 'Someone'} invited you
                </p>
                <p className="text-xs text-muted-foreground">
                  {invite.conversation?.is_group
                    ? `to "${invite.conversation?.name || 'a group'}"`
                    : 'to chat'}
                  {' · '}
                  {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDecline(invite.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => onAccept(invite.id)}
                  className="h-8 w-8 bg-primary hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
