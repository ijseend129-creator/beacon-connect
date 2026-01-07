import { Check, X, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationInvite } from '@/hooks/useConversationInvites';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

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
    <div className="border-b border-sidebar-border bg-primary/5">
      <div className="px-4 py-3 bg-primary/10">
        <h3 className="text-sm font-semibold text-primary">
          📬 Openstaande uitnodigingen ({invites.length})
        </h3>
      </div>
      <ScrollArea className="max-h-60">
        <div className="p-3 space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="p-4 rounded-xl bg-card border border-border shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
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
                  <p className="text-sm font-medium text-foreground">
                    {invite.inviter?.username || 'Iemand'} heeft je uitgenodigd
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invite.conversation?.is_group
                      ? `voor groep "${invite.conversation?.name || 'Naamloos'}"`
                      : 'om te chatten'}
                    {' · '}
                    {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true, locale: nl })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDecline(invite.id)}
                  className="flex-1 text-muted-foreground hover:text-destructive hover:border-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Weigeren
                </Button>
                <Button
                  size="sm"
                  onClick={() => onAccept(invite.id)}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accepteren
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}