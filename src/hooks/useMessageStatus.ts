import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export function useMessageStatus(conversationId: string | null) {
  const { user } = useAuth();

  // Mark messages as read when viewing a conversation
  const markAsRead = useCallback(async (messageId: string) => {
    if (!conversationId || !user) return;

    try {
      // Update the message_reads table
      const { error } = await supabase
        .from('message_reads')
        .upsert({
          user_id: user.id,
          conversation_id: conversationId,
          last_read_message_id: messageId,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,conversation_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId, user]);

  // Update message delivery status when messages are fetched
  const markAsDelivered = useCallback(async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    try {
      await supabase
        .from('messages')
        .update({ status: 'delivered' })
        .in('id', messageIds)
        .neq('sender_id', user.id)
        .eq('status', 'sent');
    } catch (error) {
      console.error('Error marking messages as delivered:', error);
    }
  }, [user]);

  return { markAsRead, markAsDelivered };
}

// Get status icon for a message
export function getMessageStatusText(status: MessageStatus): string {
  switch (status) {
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓';
    default:
      return '';
  }
}
