import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Status {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  poll_question: string | null;
  poll_options: string[] | null;
  background_color: string;
  created_at: string;
  expires_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  views_count?: number;
  has_viewed?: boolean;
  user_vote?: number | null;
  vote_counts?: Record<number, number>;
}

interface StatusView {
  id: string;
  status_id: string;
  viewer_id: string;
  viewed_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useStatuses() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [myStatuses, setMyStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchStatuses = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all non-expired statuses with profile info
      const { data: statusesData, error: statusesError } = await supabase
        .from('statuses')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (statusesError) throw statusesError;

      // Fetch profile info for each status
      const userIds = [...new Set(statusesData?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch view counts
      const statusIds = statusesData?.map(s => s.id) || [];
      const { data: views } = await supabase
        .from('status_views')
        .select('status_id, viewer_id')
        .in('status_id', statusIds);

      // Fetch poll votes
      const { data: votes } = await supabase
        .from('status_poll_votes')
        .select('status_id, option_index, user_id')
        .in('status_id', statusIds);

      const viewCounts = new Map<string, number>();
      const userViewed = new Set<string>();
      
      views?.forEach(v => {
        viewCounts.set(v.status_id, (viewCounts.get(v.status_id) || 0) + 1);
        if (v.viewer_id === user.id) {
          userViewed.add(v.status_id);
        }
      });

      const userVotes = new Map<string, number>();
      const voteCountsByStatus = new Map<string, Record<number, number>>();
      
      votes?.forEach(v => {
        if (v.user_id === user.id) {
          userVotes.set(v.status_id, v.option_index);
        }
        const counts = voteCountsByStatus.get(v.status_id) || {};
        counts[v.option_index] = (counts[v.option_index] || 0) + 1;
        voteCountsByStatus.set(v.status_id, counts);
      });

      const enrichedStatuses = statusesData?.map(s => ({
        ...s,
        poll_options: s.poll_options as string[] | null,
        profile: profileMap.get(s.user_id),
        views_count: viewCounts.get(s.id) || 0,
        has_viewed: userViewed.has(s.id),
        user_vote: userVotes.get(s.id) ?? null,
        vote_counts: voteCountsByStatus.get(s.id) || {},
      })) || [];

      // Separate my statuses from others
      setMyStatuses(enrichedStatuses.filter(s => s.user_id === user.id));
      setStatuses(enrichedStatuses.filter(s => s.user_id !== user.id));
    } catch (error) {
      console.error('Error fetching statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('statuses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'statuses' },
        () => {
          fetchStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchStatuses]);

  const createStatus = async (data: {
    content?: string;
    mediaFile?: File;
    mediaType?: 'image' | 'audio';
    pollQuestion?: string;
    pollOptions?: string[];
    backgroundColor?: string;
  }) => {
    if (!user) return false;

    try {
      let mediaUrl: string | null = null;

      // Upload media if provided
      if (data.mediaFile) {
        const fileExt = data.mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, data.mediaFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        mediaUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('statuses').insert({
        user_id: user.id,
        content: data.content || null,
        media_url: mediaUrl,
        media_type: data.pollQuestion ? 'poll' : data.mediaType || null,
        poll_question: data.pollQuestion || null,
        poll_options: data.pollOptions || null,
        background_color: data.backgroundColor || '#3b82f6',
      });

      if (error) throw error;

      toast({
        title: 'Status geplaatst',
        description: 'Je status is 24 uur zichtbaar.',
      });

      await fetchStatuses();
      return true;
    } catch (error) {
      console.error('Error creating status:', error);
      toast({
        title: 'Fout',
        description: 'Kon status niet plaatsen.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteStatus = async (statusId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('statuses')
        .delete()
        .eq('id', statusId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Status verwijderd',
      });

      await fetchStatuses();
      return true;
    } catch (error) {
      console.error('Error deleting status:', error);
      return false;
    }
  };

  const markAsViewed = async (statusId: string) => {
    if (!user) return;

    try {
      await supabase.from('status_views').upsert({
        status_id: statusId,
        viewer_id: user.id,
      }, {
        onConflict: 'status_id,viewer_id',
      });
    } catch (error) {
      console.error('Error marking status as viewed:', error);
    }
  };

  const voteOnPoll = async (statusId: string, optionIndex: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase.from('status_poll_votes').upsert({
        status_id: statusId,
        user_id: user.id,
        option_index: optionIndex,
      }, {
        onConflict: 'status_id,user_id',
      });

      if (error) throw error;

      await fetchStatuses();
      return true;
    } catch (error) {
      console.error('Error voting on poll:', error);
      return false;
    }
  };

  const getStatusViews = async (statusId: string): Promise<StatusView[]> => {
    try {
      const { data, error } = await supabase
        .from('status_views')
        .select('*')
        .eq('status_id', statusId);

      if (error) throw error;

      // Get profile info
      const viewerIds = data?.map(v => v.viewer_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', viewerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data?.map(v => ({
        ...v,
        profile: profileMap.get(v.viewer_id),
      })) || [];
    } catch (error) {
      console.error('Error fetching status views:', error);
      return [];
    }
  };

  // Group statuses by user
  const groupedStatuses = statuses.reduce((acc, status) => {
    const userId = status.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        profile: status.profile,
        statuses: [],
        has_unviewed: false,
      };
    }
    acc[userId].statuses.push(status);
    if (!status.has_viewed) {
      acc[userId].has_unviewed = true;
    }
    return acc;
  }, {} as Record<string, { user_id: string; profile?: { username: string; avatar_url: string | null }; statuses: Status[]; has_unviewed: boolean }>);

  return {
    statuses,
    myStatuses,
    groupedStatuses: Object.values(groupedStatuses),
    loading,
    createStatus,
    deleteStatus,
    markAsViewed,
    voteOnPoll,
    getStatusViews,
    refresh: fetchStatuses,
  };
}
