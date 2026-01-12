import { useAchievements } from '@/hooks/useAchievements';
import { AchievementBadge } from './AchievementBadge';
import { Trophy } from 'lucide-react';

interface ProfileAchievementsProps {
  userId: string;
  maxDisplay?: number;
  onViewAll?: () => void;
}

export function ProfileAchievements({ userId, maxDisplay = 5, onViewAll }: ProfileAchievementsProps) {
  const { achievements, userAchievements, getIconEmoji, loading } = useAchievements(userId);

  if (loading) {
    return (
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const earnedAchievements = userAchievements
    .map(ua => ({
      ...ua,
      achievement: achievements.find(a => a.id === ua.achievement_id),
    }))
    .filter(ua => ua.achievement)
    .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
    .slice(0, maxDisplay);

  if (earnedAchievements.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Trophy className="h-4 w-4" />
        <span>Nog geen achievements</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {earnedAchievements.map(ua => (
        <AchievementBadge
          key={ua.id}
          achievement={ua.achievement!}
          earned={true}
          earnedAt={ua.earned_at}
          size="sm"
          getIconEmoji={getIconEmoji}
        />
      ))}
      {userAchievements.length > maxDisplay && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          +{userAchievements.length - maxDisplay}
        </button>
      )}
    </div>
  );
}
