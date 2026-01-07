import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useConversationInvites } from '@/hooks/useConversationInvites';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { NewChatDialog } from '@/components/chat/NewChatDialog';
import { UserMenu } from '@/components/chat/UserMenu';
import { BeaconAIChat } from '@/components/chat/BeaconAIChat';
import { InviteList } from '@/components/chat/InviteList';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [username, setUsername] = useState<string>();
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [showBeaconAI, setShowBeaconAI] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { conversations, loading: convsLoading, createConversation, fetchConversations } = useConversations();
  const { messages, loading: msgsLoading, sendMessage } = useMessages(selectedConversationId);
  const { invites, acceptInvite, declineInvite } = useConversationInvites();

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  // Fetch current user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUsername(data.username);
        setAvatarUrl(data.avatar_url || undefined);
      }
    };

    fetchProfile();
  }, [user]);

  const handleProfileUpdate = (newUsername: string, newAvatarUrl: string | null) => {
    setUsername(newUsername);
    setAvatarUrl(newAvatarUrl || undefined);
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // On mobile, hide sidebar when conversation or AI is selected
  useEffect(() => {
    if ((selectedConversationId || showBeaconAI) && window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, [selectedConversationId, showBeaconAI]);

  const handleSelectAI = () => {
    setSelectedConversationId(null);
    setShowBeaconAI(true);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setShowBeaconAI(false);
    setSelectedConversationId(id);
  };

  const handleCreateChat = async (userIds: string[], name?: string, isGroup?: boolean) => {
    const convId = await createConversation(userIds, name, isGroup);
    if (convId) {
      setSelectedConversationId(convId);
      await fetchConversations();
      toast({
        title: 'Invite Sent',
        description: 'Waiting for the user to accept your invite.',
      });
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    const convId = await acceptInvite(inviteId);
    if (convId) {
      await fetchConversations();
      setSelectedConversationId(convId as string);
    }
  };

  const handleSendMessage = async (content: string, file?: File) => {
    await sendMessage(content, file);
    await fetchConversations(); // Refresh to update last message
  };

  const handleBack = () => {
    setShowSidebar(true);
    setSelectedConversationId(null);
    setShowBeaconAI(false);
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
        <UserMenu username={username} avatarUrl={avatarUrl} onProfileUpdate={handleProfileUpdate} />
        <InviteList
          invites={invites}
          onAccept={handleAcceptInvite}
          onDecline={declineInvite}
        />
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={handleSelectConversation}
          onNewChat={() => setShowNewChat(true)}
          onSelectAI={handleSelectAI}
          isAISelected={showBeaconAI}
        />
      </div>

      {/* Chat area */}
      <div
        className={`${
          showSidebar ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col min-w-0`}
      >
        {showBeaconAI ? (
          <BeaconAIChat onBack={handleBack} />
        ) : (
          <>
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
                  <p className="text-sm mb-6">Select a conversation or start a new one</p>
                  <a
                    href="https://www.gofundme.com/f/hou-beacon-gratis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
                  >
                    <span>♥</span>
                    <span>Support Beacon</span>
                  </a>
                </div>
              </div>
            )}
          </>
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
