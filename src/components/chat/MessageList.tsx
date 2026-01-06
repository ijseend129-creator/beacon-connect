import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/hooks/useMessages';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Send a message to start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4 scrollbar-thin">
      <div className="space-y-4 max-w-3xl mx-auto">
        {messages.map((message, index) => {
          const isSent = message.sender_id === user?.id;
          const showAvatar =
            !isSent &&
            (index === 0 || messages[index - 1].sender_id !== message.sender_id);

          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${isSent ? 'justify-end' : 'justify-start'} ${
                isSent ? 'animate-slide-in-right' : 'animate-slide-in-left'
              }`}
            >
              {!isSent && (
                <div className="w-8">
                  {showAvatar && (
                    <Avatar className="h-8 w-8 bg-secondary">
                      <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                        {getInitials(message.sender?.username || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}

              <div className={`max-w-[70%] ${isSent ? 'order-1' : 'order-2'}`}>
                {showAvatar && !isSent && (
                  <p className="text-xs text-muted-foreground mb-1 ml-1">
                    {message.sender?.username}
                  </p>
                )}
                <div
                  className={`px-4 py-2 ${
                    isSent
                      ? 'message-bubble-sent'
                      : 'message-bubble-received'
                  }`}
                >
                  <p className="break-words">{message.content}</p>
                </div>
                <p
                  className={`text-xs text-muted-foreground mt-1 ${
                    isSent ? 'text-right mr-1' : 'text-left ml-1'
                  }`}
                >
                  {format(new Date(message.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
