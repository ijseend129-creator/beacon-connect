import { Achievement } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  getIconEmoji: (icon: string) => string;
}

export function AchievementBadge({
  achievement,
  earned,
  earnedAt,
  progress = 0,
  size = 'md',
  showTooltip = true,
  getIconEmoji,
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-2xl',
  };

  const badge = (
    <div
      className={cn(
        'relative rounded-full flex items-center justify-center transition-all',
        sizeClasses[size],
        earned
          ? 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-amber-500/30'
          : 'bg-muted/50 grayscale opacity-50'
      )}
    >
      <span className={cn(earned ? '' : 'opacity-50')}>
        {getIconEmoji(achievement.icon)}
      </span>
      {!earned && progress > 0 && (
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 36 36"
        >
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary/30"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${progress} 100`}
            className="text-primary"
          />
        </svg>
      )}
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-center">
        <p className="font-semibold">{achievement.name}</p>
        <p className="text-xs text-muted-foreground">{achievement.description}</p>
        {earned && earnedAt && (
          <p className="text-xs text-primary mt-1">
            Behaald op {new Date(earnedAt).toLocaleDateString('nl-NL')}
          </p>
        )}
        {!earned && (
          <p className="text-xs mt-1">Voortgang: {progress}%</p>
        )}
        <p className="text-xs text-amber-500 mt-1">{achievement.points} punten</p>
      </TooltipContent>
    </Tooltip>
  );
}
