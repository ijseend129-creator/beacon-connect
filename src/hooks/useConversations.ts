import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  participants: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  }[];
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Get user's conversations
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          name,
          is_group,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // For each conversation, get participants and last message
      const conversationsWithDetails = await Promise.all(
        (convData || []).map(async (conv) => {
          // Get participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              profiles!inner(username, avatar_url)
            `)
            .eq('conversation_id', conv.id);

          // Get last message
          const { data: messages } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conv,
            participants: (participants || []).map((p: any) => ({
              user_id: p.user_id,
              username: p.profiles.username,
              avatar_url: p.profiles.avatar_url,
            })),
            last_message: messages?.[0],
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (participantIds: string[], name?: string, isGroup = false) => {
    if (!user) return null;

    try {
      // Create conversation
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: name || null,
          is_group: isGroup,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add creator as participant (creator joins immediately)
      const { error: creatorError } = await supabase
        .from('conversation_participants')
        .insert([{
          conversation_id: conv.id,
          user_id: user.id,
        }]);

      if (creatorError) throw creatorError;

      // Send invites to other users (they need to accept)
      const otherParticipants = participantIds.filter(id => id !== user.id);
      
      if (otherParticipants.length > 0) {
        const { error: inviteError } = await supabase
          .from('conversation_invites')
          .insert(
            otherParticipants.map((userId) => ({
              conversation_id: conv.id,
              inviter_id: user.id,
              invitee_id: userId,
            }))
          );

        if (inviteError) throw inviteError;
      }

      await fetchConversations();
      return conv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  return { conversations, loading, fetchConversations, createConversation };
}
