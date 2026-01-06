import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/hooks/useConversations';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
}: ConversationListProps) {
  const { user } = useAuth();

  const getConversationName = (conv: Conversation) => {
    if (conv.is_group && conv.name) return conv.name;
    
    // For 1:1 chats, show the other person's name
    const otherParticipant = conv.participants.find((p) => p.user_id !== user?.id);
    return otherParticipant?.username || 'Unknown';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-sidebar-foreground">Chats</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onNewChat}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new chat!</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${
                  selectedId === conv.id
                    ? 'bg-sidebar-accent border-l-2 border-primary'
                    : 'hover:bg-sidebar-accent/50'
                }`}
              >
                <Avatar className="h-12 w-12 bg-secondary">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {conv.is_group ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      getInitials(getConversationName(conv))
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sidebar-foreground truncate">
                      {getConversationName(conv)}
                    </span>
                    {conv.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.last_message.created_at), {
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message.content}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
