import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useConversationInvites } from '@/hooks/useConversationInvites';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useMessageStatus } from '@/hooks/useMessageStatus';
import { usePolls } from '@/hooks/usePolls';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useAchievements } from '@/hooks/useAchievements';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { NewChatDialog } from '@/components/chat/NewChatDialog';
import { UserMenu } from '@/components/chat/UserMenu';
import { BeaconAIChat } from '@/components/chat/BeaconAIChat';
import { InviteList } from '@/components/chat/InviteList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { PollList } from '@/components/chat/PollList';
import { CreatePollDialog } from '@/components/chat/CreatePollDialog';
import { AchievementsDialog } from '@/components/chat/AchievementsDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [username, setUsername] = useState<string>();
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [showBeaconAI, setShowBeaconAI] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { conversations, loading: convsLoading, createConversation, fetchConversations, leaveConversation } = useConversations();
  const { messages, loading: msgsLoading, sendMessage } = useMessages(selectedConversationId);
  const { invites, acceptInvite, declineInvite } = useConversationInvites();
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(selectedConversationId);
  const { unreadCounts, clearUnread, fetchUnreadCounts } = useUnreadCount();
  const { isOnline, addToQueue, syncQueue } = useOfflineQueue();
  const { markAsRead } = useMessageStatus(selectedConversationId);
  const { polls, createPoll, vote } = usePolls(selectedConversationId);
  const { blockedUserIds, blockUser, unblockUser } = useBlockedUsers();
  const { updateStats } = useAchievements();

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

  // Clear unread when selecting a conversation
  useEffect(() => {
    if (selectedConversationId) {
      clearUnread(selectedConversationId);
    }
  }, [selectedConversationId, clearUnread]);

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
    clearUnread(id);
  };

  const handleCreateChat = async (userIds: string[], name?: string, isGroup?: boolean) => {
    const convId = await createConversation(userIds, name, isGroup);
    if (convId) {
      setSelectedConversationId(convId);
      await fetchConversations();
      toast({
        title: 'Uitnodiging verstuurd',
        description: 'Wachten tot de gebruiker de uitnodiging accepteert.',
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

  const handleSendMessage = async (content: string, file?: File, viewOnce?: boolean, scheduledAt?: Date) => {
    stopTyping();
    
    if (!isOnline && !file && !scheduledAt) {
      // Queue message for later if offline (files and scheduled can't be queued)
      addToQueue({
        conversationId: selectedConversationId!,
        content,
        clientTimestamp: new Date().toISOString(),
      });
      return;
    }
    
    const result = await sendMessage(content, file, viewOnce, scheduledAt, () => {
      // Track achievements
      updateStats('messages_sent');
      if (file) {
        if (file.type.startsWith('audio/')) {
          updateStats('voice_messages_sent');
        } else {
          updateStats('files_sent');
        }
      }
    });
    
    if (scheduledAt && result) {
      toast({
        title: 'Bericht ingepland',
        description: `Je bericht wordt verzonden op ${scheduledAt.toLocaleString('nl-NL')}`,
      });
    }
    
    await fetchConversations(); // Refresh to update last message
  };

  const handleMessagesViewed = useCallback(async (messageIds: string[]) => {
    if (messageIds.length > 0) {
      await markAsRead(messageIds[messageIds.length - 1]);
      fetchUnreadCounts();
    }
  }, [markAsRead, fetchUnreadCounts]);

  const handleBlockUser = async (userId: string) => {
    const success = await blockUser(userId);
    if (success) {
      toast({
        title: 'Gebruiker geblokkeerd',
        description: 'Je ontvangt geen berichten meer van deze persoon.',
      });
    }
    return success;
  };

  const handleUnblockUser = async (userId: string) => {
    const success = await unblockUser(userId);
    if (success) {
      toast({
        title: 'Gebruiker gedeblokkeerd',
        description: 'Je kunt weer berichten ontvangen van deze persoon.',
      });
    }
    return success;
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const success = await leaveConversation(conversationId);
    if (success) {
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
      toast({
        title: 'Chat verwijderd',
        description: 'Je hebt het gesprek verlaten.',
      });
    }
    return success;
  };

  const handleBack = () => {
    setShowSidebar(true);
    setSelectedConversationId(null);
    setShowBeaconAI(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
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
        <UserMenu 
          username={username} 
          avatarUrl={avatarUrl} 
          onProfileUpdate={handleProfileUpdate}
          onOpenAchievements={() => setShowAchievements(true)}
        />
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
          unreadCounts={unreadCounts}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          onDeleteConversation={handleDeleteConversation}
          blockedUserIds={blockedUserIds}
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
              onConversationUpdate={fetchConversations}
            />
            
            {selectedConversation ? (
              <>
                {selectedConversation.is_group && polls.length > 0 && (
                  <PollList polls={polls} onVote={vote} />
                )}
                <MessageList 
                  messages={messages} 
                  loading={msgsLoading}
                  onMessagesViewed={handleMessagesViewed}
                />
                <TypingIndicator typingUsers={typingUsers} />
                <MessageInput 
                  onSend={handleSendMessage}
                  onTyping={startTyping}
                  isOffline={!isOnline}
                  isGroup={selectedConversation.is_group}
                  onCreatePoll={() => setShowCreatePoll(true)}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg mb-2">Welkom bij Beacon</p>
                  <p className="text-sm mb-6">Selecteer een gesprek of start een nieuwe</p>
                  <a
                    href="https://www.gofundme.com/f/hou-beacon-gratis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
                  >
                    <span>♥</span>
                    <span>Steun Beacon</span>
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
      {/* Create poll dialog */}
      <CreatePollDialog
        open={showCreatePoll}
        onClose={() => setShowCreatePoll(false)}
        onCreatePoll={createPoll}
      />

      {/* Achievements dialog */}
      <AchievementsDialog
        open={showAchievements}
        onClose={() => setShowAchievements(false)}
      />
    </div>
  );
}
