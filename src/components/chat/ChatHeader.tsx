import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/hooks/useConversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeft, Phone, Camera } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { GroupAvatarDialog } from './GroupAvatarDialog';

interface ChatHeaderProps {
  conversation: Conversation | null;
  onBack?: () => void;
  onConversationUpdate?: () => void;
}

export function ChatHeader({ conversation, onBack, onConversationUpdate }: ChatHeaderProps) {
  const { user } = useAuth();
  const { startCall, callStatus } = useCall();
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(conversation?.avatar_url || null);
  const [displayName, setDisplayName] = useState<string | null>(conversation?.name || null);

  if (!conversation) {
    return (
      <div className="h-16 border-b border-border bg-card flex items-center justify-center">
        <p className="text-muted-foreground">Selecteer een gesprek</p>
      </div>
    );
  }

  const getConversationName = () => {
    if (conversation.is_group) return displayName || conversation.name || 'Groep';
    const otherParticipant = conversation.participants.find((p) => p.user_id !== user?.id);
    return otherParticipant?.username || 'Onbekend';
  };

  const getOtherParticipantAvatar = () => {
    if (!conversation.is_group) {
      const otherParticipant = conversation.participants.find((p) => p.user_id !== user?.id);
      return otherParticipant?.avatar_url || null;
    }
    return null;
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

  const handleAvatarUpdate = (newUrl: string | null) => {
    setAvatarUrl(newUrl);
    onConversationUpdate?.();
  };

  const handleNameUpdate = (newName: string) => {
    setDisplayName(newName);
    onConversationUpdate?.();
  };

  const displayAvatarUrl = conversation.is_group 
    ? (avatarUrl || conversation.avatar_url) 
    : getOtherParticipantAvatar();

  return (
    <>
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
        
        <div 
          className={`relative ${conversation.is_group ? 'cursor-pointer group' : ''}`}
          onClick={() => conversation.is_group && setShowAvatarDialog(true)}
        >
          <Avatar className="h-10 w-10 bg-secondary">
            {displayAvatarUrl ? (
              <AvatarImage src={displayAvatarUrl} alt={getConversationName()} />
            ) : null}
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {conversation.is_group ? (
                <Users className="h-5 w-5" />
              ) : (
                getInitials(getConversationName())
              )}
            </AvatarFallback>
          </Avatar>
          
          {conversation.is_group && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        
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

      {conversation.is_group && (
        <GroupAvatarDialog
          open={showAvatarDialog}
          onClose={() => setShowAvatarDialog(false)}
          conversationId={conversation.id}
          conversationName={displayName || conversation.name || 'Groep'}
          currentAvatarUrl={avatarUrl || conversation.avatar_url}
          onAvatarUpdate={handleAvatarUpdate}
          onNameUpdate={handleNameUpdate}
        />
      )}
    </>
  );
}
