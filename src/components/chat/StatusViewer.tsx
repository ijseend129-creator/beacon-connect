import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

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

interface StatusViewerProps {
  open: boolean;
  onClose: () => void;
  statuses: Status[];
  isOwn: boolean;
  onMarkViewed: (statusId: string) => void;
  onDelete?: (statusId: string) => Promise<boolean>;
  onVotePoll?: (statusId: string, optionIndex: number) => Promise<boolean>;
  onViewViews?: (statusId: string) => void;
}

const STATUS_DURATION = 5000; // 5 seconds per status

export function StatusViewer({
  open,
  onClose,
  statuses,
  isOwn,
  onMarkViewed,
  onDelete,
  onVotePoll,
  onViewViews,
}: StatusViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStatus = statuses[currentIndex];

  const goToNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, statuses.length, onClose]);

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  // Mark status as viewed when it becomes current
  useEffect(() => {
    if (currentStatus && !isOwn && !currentStatus.has_viewed) {
      onMarkViewed(currentStatus.id);
    }
  }, [currentStatus, isOwn, onMarkViewed]);

  // Progress timer
  useEffect(() => {
    if (!open || isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (STATUS_DURATION / 100));
        if (newProgress >= 100) {
          goToNext();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, isPaused, goToNext]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [open]);

  const handleVote = async (optionIndex: number) => {
    if (onVotePoll && currentStatus) {
      setIsPaused(true);
      await onVotePoll(currentStatus.id, optionIndex);
      setIsPaused(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete && currentStatus) {
      const success = await onDelete(currentStatus.id);
      if (success) {
        if (statuses.length === 1) {
          onClose();
        } else if (currentIndex >= statuses.length - 1) {
          setCurrentIndex(currentIndex - 1);
        }
      }
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  const getTotalVotes = () => {
    if (!currentStatus?.vote_counts) return 0;
    return Object.values(currentStatus.vote_counts).reduce((a, b) => a + b, 0);
  };

  const getVotePercentage = (index: number) => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    return Math.round(((currentStatus?.vote_counts?.[index] || 0) / total) * 100);
  };

  if (!currentStatus) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden bg-black border-none max-h-[90vh]"
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2">
          {statuses.map((_, index) => (
            <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-50 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src={currentStatus.profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {getInitials(currentStatus.profile?.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-sm">
                {currentStatus.profile?.username || 'Gebruiker'}
              </p>
              <p className="text-white/60 text-xs">
                {formatDistanceToNow(new Date(currentStatus.created_at), { addSuffix: true, locale: nl })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewViews && (
                    <DropdownMenuItem onClick={() => onViewViews(currentStatus.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Bekeken door ({currentStatus.views_count || 0})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation areas */}
        <div className="absolute inset-0 flex z-40">
          <button
            className="w-1/3 h-full"
            onClick={goToPrev}
            disabled={currentIndex === 0}
          />
          <div className="w-1/3 h-full" />
          <button
            className="w-1/3 h-full"
            onClick={goToNext}
          />
        </div>

        {/* Navigation arrows (desktop) */}
        <div className="hidden md:flex absolute inset-y-0 left-2 items-center z-50">
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={goToPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
        </div>
        <div className="hidden md:flex absolute inset-y-0 right-2 items-center z-50">
          {currentIndex < statuses.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div 
          className="min-h-[500px] flex items-center justify-center p-8 pt-20"
          style={{ 
            backgroundColor: currentStatus.media_type !== 'image' ? currentStatus.background_color : 'black' 
          }}
        >
          {currentStatus.media_type === 'image' && currentStatus.media_url && (
            <div className="relative w-full">
              <img
                src={currentStatus.media_url}
                alt=""
                className="w-full max-h-[400px] object-contain"
              />
              {currentStatus.content && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/50 rounded-lg p-3">
                  <p className="text-white text-center">{currentStatus.content}</p>
                </div>
              )}
            </div>
          )}

          {currentStatus.media_type === 'audio' && currentStatus.media_url && (
            <div className="w-full space-y-4">
              <audio
                src={currentStatus.media_url}
                controls
                autoPlay
                className="w-full"
              />
              {currentStatus.content && (
                <p className="text-white text-center text-xl">{currentStatus.content}</p>
              )}
            </div>
          )}

          {currentStatus.media_type === 'poll' && currentStatus.poll_question && (
            <div className="w-full space-y-4">
              <h3 className="text-white text-xl font-semibold text-center">
                {currentStatus.poll_question}
              </h3>
              <div className="space-y-2">
                {currentStatus.poll_options?.map((option, index) => {
                  const hasVoted = currentStatus.user_vote !== null;
                  const isSelected = currentStatus.user_vote === index;
                  const percentage = getVotePercentage(index);

                  return (
                    <button
                      key={index}
                      onClick={() => !hasVoted && !isOwn && handleVote(index)}
                      disabled={hasVoted || isOwn}
                      className={cn(
                        "w-full p-3 rounded-lg text-left relative overflow-hidden transition-colors",
                        hasVoted || isOwn
                          ? "bg-white/20 cursor-default"
                          : "bg-white/30 hover:bg-white/40 cursor-pointer"
                      )}
                    >
                      {(hasVoted || isOwn) && (
                        <div
                          className="absolute inset-y-0 left-0 bg-white/30 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                      <div className="relative flex justify-between items-center">
                        <span className={cn(
                          "text-white",
                          isSelected && "font-semibold"
                        )}>
                          {option}
                        </span>
                        {(hasVoted || isOwn) && (
                          <span className="text-white/80 text-sm">{percentage}%</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {(currentStatus.user_vote !== null || isOwn) && (
                <p className="text-white/60 text-center text-sm">
                  {getTotalVotes()} stem{getTotalVotes() !== 1 ? 'men' : ''}
                </p>
              )}
            </div>
          )}

          {!currentStatus.media_type && currentStatus.content && (
            <p className="text-white text-2xl font-medium text-center">
              {currentStatus.content}
            </p>
          )}
        </div>

        {/* Views count for own status */}
        {isOwn && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-50">
            <button 
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              onClick={() => onViewViews?.(currentStatus.id)}
            >
              <Eye className="h-4 w-4" />
              <span className="text-sm">{currentStatus.views_count || 0} weergaven</span>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
