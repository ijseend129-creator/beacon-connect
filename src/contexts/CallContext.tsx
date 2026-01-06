import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTCCall, CallStatus } from '@/hooks/useWebRTCCall';
import { IncomingCallDialog } from '@/components/call/IncomingCallDialog';
import { ActiveCallOverlay } from '@/components/call/ActiveCallOverlay';

interface IncomingCall {
  callId: string;
  conversationId: string;
  callerName: string;
  isGroup: boolean;
}

interface CallContextValue {
  startCall: (conversationId: string) => Promise<void>;
  callStatus: CallStatus;
  activeConversationId: string | null;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
    callState,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    setCallState,
  } = useWebRTCCall();
  
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCallName, setActiveCallName] = useState('');
  const [isGroupCall, setIsGroupCall] = useState(false);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    console.log('Setting up call listener for user:', user.id);

    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
        },
        async (payload) => {
          const call = payload.new as any;
          console.log('New call detected:', call);
          
          // Ignore our own calls
          if (call.caller_id === user.id) return;
          
          // Check if we're a participant in this conversation
          const { data: participant } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', call.conversation_id)
            .eq('user_id', user.id)
            .single();
          
          if (!participant) return;
          
          // Get caller info and conversation info
          const [{ data: callerProfile }, { data: conversation }] = await Promise.all([
            supabase
              .from('profiles')
              .select('username')
              .eq('id', call.caller_id)
              .single(),
            supabase
              .from('conversations')
              .select('name, is_group')
              .eq('id', call.conversation_id)
              .single(),
          ]);
          
          const callerName = callerProfile?.username || 'Unknown';
          const displayName = conversation?.is_group 
            ? conversation?.name || 'Group Call' 
            : callerName;
          
          console.log('Incoming call from:', displayName);
          
          setIncomingCall({
            callId: call.id,
            conversationId: call.conversation_id,
            callerName: displayName,
            isGroup: conversation?.is_group || false,
          });
          setCallState(prev => ({
            ...prev,
            status: 'ringing',
            callId: call.id,
            conversationId: call.conversation_id,
            callerId: call.caller_id,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, setCallState]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    
    setActiveCallName(incomingCall.callerName);
    setIsGroupCall(incomingCall.isGroup);
    setIncomingCall(null);
    
    await answerCall(incomingCall.callId, incomingCall.conversationId);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    
    await declineCall(incomingCall.callId);
    setIncomingCall(null);
  };

  const handleStartCall = async (conversationId: string) => {
    // Get conversation info for display
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        name,
        is_group,
        conversation_participants (
          user_id,
          profiles:user_id (username)
        )
      `)
      .eq('id', conversationId)
      .single();
    
    if (conversation) {
      if (conversation.is_group) {
        setActiveCallName(conversation.name || 'Group Call');
        setIsGroupCall(true);
      } else {
        const otherParticipant = (conversation.conversation_participants as any[])?.find(
          (p: any) => p.user_id !== user?.id
        );
        setActiveCallName(otherParticipant?.profiles?.username || 'Unknown');
        setIsGroupCall(false);
      }
    }
    
    await startCall(conversationId);
  };

  return (
    <CallContext.Provider
      value={{
        startCall: handleStartCall,
        callStatus: callState.status,
        activeConversationId: callState.conversationId,
      }}
    >
      {children}
      
      {/* Incoming call dialog */}
      <IncomingCallDialog
        open={!!incomingCall && callState.status === 'ringing'}
        callerName={incomingCall?.callerName || ''}
        onAnswer={handleAnswer}
        onDecline={handleDecline}
      />
      
      {/* Active call overlay */}
      {(callState.status === 'calling' || callState.status === 'active') && (
        <ActiveCallOverlay
          participantName={activeCallName}
          isGroup={isGroupCall}
          isMuted={callState.isMuted}
          onEndCall={endCall}
          onToggleMute={toggleMute}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
