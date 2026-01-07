import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUnreadCount() {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const { user } = useAuth();

  const fetchUnreadCounts = async () => {
    if (!user) return;

    try {
      // Get all conversations the user is part of
      const { data: convData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!convData) return;

      const counts: Record<string, number> = {};

      // For each conversation, count unread messages
      for (const { conversation_id } of convData) {
        // Get the user's last read message
        const { data: readData } = await supabase
          .from('message_reads')
          .select('last_read_at')
          .eq('user_id', user.id)
          .eq('conversation_id', conversation_id)
          .single();

        const lastReadAt = readData?.last_read_at;

        // Count messages after last read time
        let query = supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('conversation_id', conversation_id)
          .neq('sender_id', user.id);

        if (lastReadAt) {
          query = query.gt('created_at', lastReadAt);
        }

        const { count } = await query;
        counts[conversation_id] = count || 0;
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
  }, [user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (payload.new.sender_id !== user.id) {
            fetchUnreadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearUnread = (conversationId: string) => {
    setUnreadCounts(prev => ({
      ...prev,
      [conversationId]: 0,
    }));
  };

  return { unreadCounts, fetchUnreadCounts, clearUnread };
}
