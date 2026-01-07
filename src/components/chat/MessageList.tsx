import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Message, MessageStatus } from '@/hooks/useMessages';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday, isYesterday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { FileText, Download, Check, CheckCheck } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  onMessagesViewed?: (messageIds: string[]) => void;
}

function MessageStatusIcon({ status, isSent }: { status: MessageStatus; isSent: boolean }) {
  if (!isSent) return null;
  
  if (status === 'read') {
    return <CheckCheck className="h-3.5 w-3.5 text-primary" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return `Gisteren ${format(date, 'HH:mm')}`;
  } else {
    return format(date, 'd MMM HH:mm', { locale: nl });
  }
}

export function MessageList({ messages, loading, onMessagesViewed }: MessageListProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent when messages are viewed
  useEffect(() => {
    if (!onMessagesViewed || !user) return;

    const newMessages = messages.filter(
      msg => msg.sender_id !== user.id && !hasNotifiedRef.current.has(msg.id)
    );

    if (newMessages.length > 0) {
      const ids = newMessages.map(m => m.id);
      ids.forEach(id => hasNotifiedRef.current.add(id));
      onMessagesViewed(ids);
    }
  }, [messages, user, onMessagesViewed]);

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
        <div className="animate-pulse text-muted-foreground">Berichten laden...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">Nog geen berichten</p>
          <p className="text-sm">Stuur een bericht om te beginnen!</p>
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
                  {message.file_url && message.file_type?.startsWith('image/') && (
                    <a href={message.file_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={message.file_url}
                        alt={message.file_name || 'Afbeelding'}
                        className="max-w-[280px] max-h-[200px] rounded-lg mb-2 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </a>
                  )}
                  {message.file_url && !message.file_type?.startsWith('image/') && (
                    <a
                      href={message.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-background/50 rounded-lg mb-2 hover:bg-background/70 transition-colors"
                    >
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{message.file_name}</p>
                        <p className="text-xs text-muted-foreground">Klik om te downloaden</p>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                  )}
                  {message.content && (!message.file_url || message.content !== message.file_name) && (
                    <p className="break-words">{message.content}</p>
                  )}
                </div>
                <div
                  className={`flex items-center gap-1 mt-1 ${
                    isSent ? 'justify-end mr-1' : 'justify-start ml-1'
                  }`}
                >
                  <p className="text-xs text-muted-foreground">
                    {formatMessageTime(message.created_at)}
                  </p>
                  <MessageStatusIcon status={message.status} isSent={isSent} />
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
