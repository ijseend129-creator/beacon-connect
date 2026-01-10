import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useBlockedUsers() {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBlockedUsers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) throw error;

      setBlockedUserIds((data || []).map(b => b.blocked_id));
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async (blockedId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedId,
        });

      if (error) throw error;

      setBlockedUserIds(prev => [...prev, blockedId]);
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  };

  const unblockUser = async (blockedId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedId);

      if (error) throw error;

      setBlockedUserIds(prev => prev.filter(id => id !== blockedId));
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  };

  const isBlocked = (userId: string) => blockedUserIds.includes(userId);

  useEffect(() => {
    fetchBlockedUsers();
  }, [user]);

  return { blockedUserIds, loading, blockUser, unblockUser, isBlocked, fetchBlockedUsers };
}
