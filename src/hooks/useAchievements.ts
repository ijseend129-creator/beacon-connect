import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_value: number;
  points: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface UserStats {
  id: string;
  user_id: string;
  messages_sent: number;
  groups_created: number;
  polls_created: number;
  files_sent: number;
  voice_messages_sent: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

const iconMap: Record<string, string> = {
  MessageSquare: '💬',
  Flame: '🔥',
  Users: '👥',
  BarChart3: '📊',
  File: '📁',
  Mic: '🎤',
};

export function useAchievements(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    const { data } = await supabase
      .from('achievements')
      .select('*')
      .order('category', { ascending: true })
      .order('requirement_value', { ascending: true });
    
    if (data) setAchievements(data);
  }, []);

  const fetchUserAchievements = useCallback(async () => {
    if (!targetUserId) return;

    const { data } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', targetUserId);
    
    if (data) setUserAchievements(data);
  }, [targetUserId]);

  const fetchUserStats = useCallback(async () => {
    if (!targetUserId) return;

    const { data } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();
    
    if (data) {
      setUserStats(data);
    } else if (user?.id === targetUserId) {
      // Create initial stats for current user
      const { data: newStats } = await supabase
        .from('user_stats')
        .insert({ user_id: targetUserId })
        .select()
        .single();
      
      if (newStats) setUserStats(newStats);
    }
  }, [targetUserId, user?.id]);

  const checkAndAwardAchievements = useCallback(async (stats: UserStats) => {
    if (!user?.id || user.id !== stats.user_id) return;

    const earnedKeys = new Set(
      userAchievements
        .map(ua => achievements.find(a => a.id === ua.achievement_id)?.key)
        .filter(Boolean)
    );

    const toAward: Achievement[] = [];

    for (const achievement of achievements) {
      if (earnedKeys.has(achievement.key)) continue;

      let earned = false;

      switch (achievement.key) {
        case 'first_message':
          earned = stats.messages_sent >= 1;
          break;
        case 'messages_10':
          earned = stats.messages_sent >= 10;
          break;
        case 'messages_100':
          earned = stats.messages_sent >= 100;
          break;
        case 'messages_500':
          earned = stats.messages_sent >= 500;
          break;
        case 'messages_1000':
          earned = stats.messages_sent >= 1000;
          break;
        case 'streak_3':
          earned = stats.current_streak >= 3 || stats.longest_streak >= 3;
          break;
        case 'streak_7':
          earned = stats.current_streak >= 7 || stats.longest_streak >= 7;
          break;
        case 'streak_14':
          earned = stats.current_streak >= 14 || stats.longest_streak >= 14;
          break;
        case 'streak_30':
          earned = stats.current_streak >= 30 || stats.longest_streak >= 30;
          break;
        case 'streak_100':
          earned = stats.current_streak >= 100 || stats.longest_streak >= 100;
          break;
        case 'first_group':
          earned = stats.groups_created >= 1;
          break;
        case 'groups_5':
          earned = stats.groups_created >= 5;
          break;
        case 'first_poll':
          earned = stats.polls_created >= 1;
          break;
        case 'polls_10':
          earned = stats.polls_created >= 10;
          break;
        case 'first_file':
          earned = stats.files_sent >= 1;
          break;
        case 'files_25':
          earned = stats.files_sent >= 25;
          break;
        case 'first_voice':
          earned = stats.voice_messages_sent >= 1;
          break;
        case 'voice_20':
          earned = stats.voice_messages_sent >= 20;
          break;
      }

      if (earned) {
        toAward.push(achievement);
      }
    }

    for (const achievement of toAward) {
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievement.id,
        });

      if (!error) {
        toast.success(`🏆 Achievement behaald: ${achievement.name}!`, {
          description: achievement.description,
          duration: 5000,
        });
      }
    }

    if (toAward.length > 0) {
      fetchUserAchievements();
    }
  }, [achievements, userAchievements, user?.id, fetchUserAchievements]);

  const updateStats = useCallback(async (
    statKey: keyof Pick<UserStats, 'messages_sent' | 'groups_created' | 'polls_created' | 'files_sent' | 'voice_messages_sent'>
  ) => {
    if (!user?.id) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Get current stats
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!currentStats) {
      // Create new stats
      const { data } = await supabase
        .from('user_stats')
        .insert({
          user_id: user.id,
          messages_sent: statKey === 'messages_sent' ? 1 : 0,
          groups_created: statKey === 'groups_created' ? 1 : 0,
          polls_created: statKey === 'polls_created' ? 1 : 0,
          files_sent: statKey === 'files_sent' ? 1 : 0,
          voice_messages_sent: statKey === 'voice_messages_sent' ? 1 : 0,
          current_streak: 1,
          longest_streak: 1,
          last_active_date: today,
        })
        .select()
        .single();

      if (data) {
        setUserStats(data);
        checkAndAwardAchievements(data);
      }
    } else {
      // Update streak
      let newStreak = currentStats.current_streak;
      let longestStreak = currentStats.longest_streak;
      
      if (currentStats.last_active_date) {
        const lastDate = new Date(currentStats.last_active_date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak = currentStats.current_streak + 1;
          longestStreak = Math.max(longestStreak, newStreak);
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const { data } = await supabase
        .from('user_stats')
        .update({
          [statKey]: (currentStats[statKey] as number) + 1,
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_active_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (data) {
        setUserStats(data);
        checkAndAwardAchievements(data);
      }
    }
  }, [user?.id, checkAndAwardAchievements]);

  const getProgress = useCallback((achievement: Achievement): number => {
    if (!userStats) return 0;

    let current = 0;
    
    switch (achievement.category) {
      case 'messages':
        current = userStats.messages_sent;
        break;
      case 'streaks':
        current = Math.max(userStats.current_streak, userStats.longest_streak);
        break;
      case 'features':
        if (achievement.key.includes('group')) current = userStats.groups_created;
        else if (achievement.key.includes('poll')) current = userStats.polls_created;
        else if (achievement.key.includes('file')) current = userStats.files_sent;
        else if (achievement.key.includes('voice')) current = userStats.voice_messages_sent;
        break;
    }

    return Math.min(100, Math.round((current / achievement.requirement_value) * 100));
  }, [userStats]);

  const getTotalPoints = useCallback((): number => {
    return userAchievements.reduce((total, ua) => {
      const achievement = achievements.find(a => a.id === ua.achievement_id);
      return total + (achievement?.points || 0);
    }, 0);
  }, [userAchievements, achievements]);

  const getIconEmoji = (iconName: string): string => {
    return iconMap[iconName] || '🏆';
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAchievements(),
        fetchUserAchievements(),
        fetchUserStats(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchAchievements, fetchUserAchievements, fetchUserStats]);

  // Listen for new achievements
  useEffect(() => {
    if (!targetUserId) return;

    const channel = supabase
      .channel('user-achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${targetUserId}`,
        },
        () => {
          fetchUserAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, fetchUserAchievements]);

  return {
    achievements,
    userAchievements,
    userStats,
    loading,
    updateStats,
    getProgress,
    getTotalPoints,
    getIconEmoji,
    isEarned: (achievementId: string) => 
      userAchievements.some(ua => ua.achievement_id === achievementId),
  };
}
