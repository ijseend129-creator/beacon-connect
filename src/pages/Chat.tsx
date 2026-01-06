import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { NewChatDialog } from '@/components/chat/NewChatDialog';
import { UserMenu } from '@/components/chat/UserMenu';
import { supabase } from '@/integrations/supabase/client';

export default function Chat() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [username, setUsername] = useState<string>();

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { conversations, loading: convsLoading, createConversation, fetchConversations } = useConversations();
  const { messages, loading: msgsLoading, sendMessage } = useMessages(selectedConversationId);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  // Fetch current user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUsername(data.username);
      }
    };

    fetchProfile();
  }, [user]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // On mobile, hide sidebar when conversation is selected
  useEffect(() => {
    if (selectedConversationId && window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, [selectedConversationId]);

  const handleCreateChat = async (userIds: string[], name?: string, isGroup?: boolean) => {
    const convId = await createConversation(userIds, name, isGroup);
    if (convId) {
      setSelectedConversationId(convId);
      await fetchConversations();
    }
  };

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
    await fetchConversations(); // Refresh to update last message
  };

  const handleBack = () => {
    setShowSidebar(true);
    setSelectedConversationId(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0`}
      >
        <UserMenu username={username} />
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          onNewChat={() => setShowNewChat(true)}
        />
      </div>

      {/* Chat area */}
      <div
        className={`${
          showSidebar ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col min-w-0`}
      >
        <ChatHeader
          conversation={selectedConversation}
          onBack={handleBack}
        />
        
        {selectedConversation ? (
          <>
            <MessageList messages={messages} loading={msgsLoading} />
            <MessageInput onSend={handleSendMessage} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Welcome to Beacon</p>
              <p className="text-sm">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New chat dialog */}
      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onCreateChat={handleCreateChat}
      />
    </div>
  );
}
