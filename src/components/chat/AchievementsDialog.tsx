import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementBadge } from './AchievementBadge';
import { Flame, Trophy, MessageSquare, Sparkles } from 'lucide-react';

interface AchievementsDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  username?: string;
}

export function AchievementsDialog({ open, onClose, userId, username }: AchievementsDialogProps) {
  const {
    achievements,
    userAchievements,
    userStats,
    loading,
    getProgress,
    getTotalPoints,
    getIconEmoji,
    isEarned,
  } = useAchievements(userId);

  const categories = [
    { key: 'all', label: 'Alle', icon: Trophy },
    { key: 'messages', label: 'Berichten', icon: MessageSquare },
    { key: 'streaks', label: 'Streaks', icon: Flame },
    { key: 'features', label: 'Features', icon: Sparkles },
  ];

  const filterByCategory = (category: string) => {
    if (category === 'all') return achievements;
    return achievements.filter(a => a.category === category);
  };

  const earnedCount = userAchievements.length;
  const totalCount = achievements.length;
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            {username ? `${username}'s Achievements` : 'Mijn Achievements'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Totaal behaald</span>
                <span className="font-bold text-lg">{earnedCount}/{totalCount}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{getTotalPoints()} punten</span>
                </div>
                {userStats && (
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>{userStats.current_streak} dagen streak</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            {userStats && (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-muted/20 rounded-lg p-2">
                  <div className="font-bold text-lg">{userStats.messages_sent}</div>
                  <div className="text-muted-foreground text-xs">Berichten</div>
                </div>
                <div className="bg-muted/20 rounded-lg p-2">
                  <div className="font-bold text-lg">{userStats.groups_created}</div>
                  <div className="text-muted-foreground text-xs">Groepen</div>
                </div>
                <div className="bg-muted/20 rounded-lg p-2">
                  <div className="font-bold text-lg">{userStats.longest_streak}</div>
                  <div className="text-muted-foreground text-xs">Langste streak</div>
                </div>
              </div>
            )}

            {/* Achievements Tabs */}
            <Tabs defaultValue="all" className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                {categories.map(cat => (
                  <TabsTrigger key={cat.key} value={cat.key} className="text-xs">
                    <cat.icon className="h-3 w-3 mr-1" />
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map(cat => (
                <TabsContent key={cat.key} value={cat.key} className="mt-4">
                  <ScrollArea className="h-[250px]">
                    <div className="grid grid-cols-4 gap-3 pr-4">
                      {filterByCategory(cat.key).map(achievement => {
                        const earned = isEarned(achievement.id);
                        const earnedData = userAchievements.find(
                          ua => ua.achievement_id === achievement.id
                        );
                        return (
                          <div key={achievement.id} className="flex flex-col items-center gap-1">
                            <AchievementBadge
                              achievement={achievement}
                              earned={earned}
                              earnedAt={earnedData?.earned_at}
                              progress={getProgress(achievement)}
                              size="md"
                              getIconEmoji={getIconEmoji}
                            />
                            <span className="text-xs text-center text-muted-foreground truncate w-full">
                              {achievement.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
