import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTypingIndicator(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);
  const { user } = useAuth();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Update typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !user) return;

    try {
      await supabase
        .from('conversation_participants')
        .update({ typing_at: isTyping ? new Date().toISOString() : null })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [conversationId, user]);

  // Start typing with auto-stop after 3 seconds
  const startTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setTyping(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Subscribe to typing changes
  useEffect(() => {
    if (!conversationId) {
      setTypingUsers([]);
      return;
    }

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch all typing users
          const { data } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              typing_at,
              profiles!inner(username)
            `)
            .eq('conversation_id', conversationId)
            .not('typing_at', 'is', null)
            .neq('user_id', user?.id);

          const now = new Date();
          const typing = (data || [])
            .filter((p: any) => {
              const typingAt = new Date(p.typing_at);
              return now.getTime() - typingAt.getTime() < 5000;
            })
            .map((p: any) => ({
              userId: p.user_id,
              username: p.profiles.username,
            }));

          setTypingUsers(typing);
        }
      )
      .subscribe();

    // Initial fetch
    const fetchTyping = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          typing_at,
          profiles!inner(username)
        `)
        .eq('conversation_id', conversationId)
        .not('typing_at', 'is', null)
        .neq('user_id', user?.id);

      const now = new Date();
      const typing = (data || [])
        .filter((p: any) => {
          const typingAt = new Date(p.typing_at);
          return now.getTime() - typingAt.getTime() < 5000;
        })
        .map((p: any) => ({
          userId: p.user_id,
          username: p.profiles.username,
        }));

      setTypingUsers(typing);
    };

    fetchTyping();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user?.id]);

  return { typingUsers, startTyping, stopTyping };
}
