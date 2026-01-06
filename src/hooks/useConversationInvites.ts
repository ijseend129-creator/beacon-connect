import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ConversationInvite {
  id: string;
  conversation_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at: string | null;
  inviter?: {
    username: string;
  };
  conversation?: {
    name: string | null;
    is_group: boolean;
  };
}

export function useConversationInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<ConversationInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!user) return;

    try {
      // First get invites
      const { data: inviteData, error: inviteError } = await supabase
        .from('conversation_invites')
        .select('*')
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;

      // Then get related data for each invite
      const invitesWithDetails = await Promise.all(
        (inviteData || []).map(async (invite) => {
          const [{ data: inviterData }, { data: conversationData }] = await Promise.all([
            supabase.from('profiles').select('username').eq('id', invite.inviter_id).single(),
            supabase.from('conversations').select('name, is_group').eq('id', invite.conversation_id).single(),
          ]);

          return {
            ...invite,
            inviter: inviterData,
            conversation: conversationData,
          };
        })
      );

      setInvites(invitesWithDetails as ConversationInvite[]);

    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to new invites
  useEffect(() => {
    if (!user) return;

    fetchInvites();

    const channel = supabase
      .channel('invite-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_invites',
          filter: `invitee_id=eq.${user.id}`,
        },
        () => {
          fetchInvites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchInvites]);

  const acceptInvite = async (inviteId: string) => {
    if (!user) return false;

    try {
      // Get the invite details
      const { data: invite, error: fetchError } = await supabase
        .from('conversation_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (fetchError || !invite) throw fetchError;

      // Add user to conversation participants
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([{
          conversation_id: invite.conversation_id,
          user_id: user.id,
        }]);

      if (participantError) throw participantError;

      // Update invite status
      const { error: updateError } = await supabase
        .from('conversation_invites')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      toast({
        title: 'Invite Accepted',
        description: 'You can now view this conversation.',
      });

      await fetchInvites();
      return invite.conversation_id;
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        title: 'Error',
        description: 'Could not accept the invite.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const declineInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_invites')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;

      toast({ title: 'Invite Declined' });
      await fetchInvites();
    } catch (error) {
      console.error('Error declining invite:', error);
      toast({
        title: 'Error',
        description: 'Could not decline the invite.',
        variant: 'destructive',
      });
    }
  };

  const sendInvite = async (conversationId: string, inviteeId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('conversation_invites')
        .insert([{
          conversation_id: conversationId,
          inviter_id: user.id,
          invitee_id: inviteeId,
        }]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending invite:', error);
      return false;
    }
  };

  return {
    invites,
    loading,
    acceptInvite,
    declineInvite,
    sendInvite,
    fetchInvites,
  };
}
