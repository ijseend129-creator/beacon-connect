import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
  voted_by_me: boolean;
}

export interface Poll {
  id: string;
  conversation_id: string;
  creator_id: string;
  question: string;
  created_at: string;
  expires_at: string | null;
  is_anonymous: boolean;
  multiple_choice: boolean;
  options: PollOption[];
  total_votes: number;
  creator?: {
    username: string;
    avatar_url: string | null;
  };
}

export function usePolls(conversationId: string | null) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPolls = async () => {
    if (!conversationId || !user) return;

    setLoading(true);
    try {
      // Fetch polls
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      // Fetch options for all polls
      const pollIds = pollsData?.map(p => p.id) || [];
      
      if (pollIds.length === 0) {
        setPolls([]);
        return;
      }

      const { data: optionsData, error: optionsError } = await supabase
        .from('poll_options')
        .select('*')
        .in('poll_id', pollIds);

      if (optionsError) throw optionsError;

      // Fetch votes for all polls
      const { data: votesData, error: votesError } = await supabase
        .from('poll_votes')
        .select('*')
        .in('poll_id', pollIds);

      if (votesError) throw votesError;

      // Fetch creators
      const creatorIds = [...new Set(pollsData.map(p => p.creator_id))];
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', creatorIds);

      const creatorsMap = new Map(creatorsData?.map(c => [c.id, c]) || []);

      // Combine data
      const enrichedPolls: Poll[] = (pollsData || []).map(poll => {
        const pollOptions = (optionsData || []).filter(o => o.poll_id === poll.id);
        const pollVotes = (votesData || []).filter(v => v.poll_id === poll.id);
        const creator = creatorsMap.get(poll.creator_id);

        const options: PollOption[] = pollOptions.map(opt => ({
          id: opt.id,
          poll_id: opt.poll_id,
          option_text: opt.option_text,
          vote_count: pollVotes.filter(v => v.option_id === opt.id).length,
          voted_by_me: pollVotes.some(v => v.option_id === opt.id && v.user_id === user.id),
        }));

        return {
          ...poll,
          options,
          total_votes: pollVotes.length,
          creator: creator ? { username: creator.username, avatar_url: creator.avatar_url } : undefined,
        };
      });

      setPolls(enrichedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [conversationId, user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`polls-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => fetchPolls()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
        },
        () => fetchPolls()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const createPoll = async (
    question: string,
    options: string[],
    isAnonymous: boolean = false,
    multipleChoice: boolean = false,
    expiresAt?: Date
  ) => {
    if (!conversationId || !user) return null;

    try {
      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          conversation_id: conversationId,
          creator_id: user.id,
          question,
          is_anonymous: isAnonymous,
          multiple_choice: multipleChoice,
          expires_at: expiresAt?.toISOString() || null,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create options
      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(
          options.map(opt => ({
            poll_id: poll.id,
            option_text: opt,
          }))
        );

      if (optionsError) throw optionsError;

      toast({
        title: 'Poll aangemaakt',
        description: 'Je poll is geplaatst in de groep.',
      });

      await fetchPolls();
      return poll.id;
    } catch (error) {
      console.error('Error creating poll:', error);
      toast({
        title: 'Fout',
        description: 'Kon poll niet aanmaken.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const vote = async (pollId: string, optionId: string) => {
    if (!user) return;

    try {
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;

      const option = poll.options.find(o => o.id === optionId);
      if (!option) return;

      if (option.voted_by_me) {
        // Remove vote
        const { error } = await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', pollId)
          .eq('option_id', optionId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // If not multiple choice, remove existing votes first
        if (!poll.multiple_choice) {
          await supabase
            .from('poll_votes')
            .delete()
            .eq('poll_id', pollId)
            .eq('user_id', user.id);
        }

        // Add vote
        const { error } = await supabase
          .from('poll_votes')
          .insert({
            poll_id: pollId,
            option_id: optionId,
            user_id: user.id,
          });

        if (error) throw error;
      }

      await fetchPolls();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Fout',
        description: 'Kon niet stemmen.',
        variant: 'destructive',
      });
    }
  };

  return {
    polls,
    loading,
    createPoll,
    vote,
    refetch: fetchPolls,
  };
}
