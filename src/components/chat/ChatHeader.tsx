import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/hooks/useConversations';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeft, Phone } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';

interface ChatHeaderProps {
  conversation: Conversation | null;
  onBack?: () => void;
}

export function ChatHeader({ conversation, onBack }: ChatHeaderProps) {
  const { user } = useAuth();
  const { startCall, callStatus } = useCall();

  if (!conversation) {
    return (
      <div className="h-16 border-b border-border bg-card flex items-center justify-center">
        <p className="text-muted-foreground">Selecteer een gesprek</p>
      </div>
    );
  }

  const getConversationName = () => {
    if (conversation.is_group && conversation.name) return conversation.name;
    const otherParticipant = conversation.participants.find((p) => p.user_id !== user?.id);
    return otherParticipant?.username || 'Onbekend';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCall = () => {
    if (callStatus === 'idle') {
      startCall(conversation.id);
    }
  };

  return (
    <div className="h-16 border-b border-border bg-card px-4 flex items-center gap-3">
      {onBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <Avatar className="h-10 w-10 bg-secondary">
        <AvatarFallback className="bg-secondary text-secondary-foreground">
          {conversation.is_group ? (
            <Users className="h-5 w-5" />
          ) : (
            getInitials(getConversationName())
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground">{getConversationName()}</h3>
        {conversation.is_group && (
          <p className="text-xs text-muted-foreground">
            {conversation.participants.length} leden
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCall}
        disabled={callStatus !== 'idle'}
        className="text-primary hover:bg-primary/10"
      >
        <Phone className="h-5 w-5" />
      </Button>
    </div>
  );
}
