import { Poll } from '@/hooks/usePolls';
import { Progress } from '@/components/ui/progress';
import { Check, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface PollCardProps {
  poll: Poll;
  onVote: (pollId: string, optionId: string) => void;
}

export function PollCard({ poll, onVote }: PollCardProps) {
  const hasVoted = poll.options.some(o => o.voted_by_me);

  return (
    <div className="bg-card border border-border rounded-xl p-4 max-w-sm">
      <div className="flex items-start gap-2 mb-3">
        <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-sm leading-tight">{poll.question}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {poll.creator?.username} • {formatDistanceToNow(new Date(poll.created_at), { 
              addSuffix: true, 
              locale: nl 
            })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const percentage = poll.total_votes > 0 
            ? Math.round((option.vote_count / poll.total_votes) * 100) 
            : 0;

          return (
            <button
              key={option.id}
              onClick={() => onVote(poll.id, option.id)}
              className={cn(
                "w-full text-left rounded-lg p-2 relative overflow-hidden transition-all",
                "border border-border hover:border-primary/50",
                option.voted_by_me && "border-primary bg-primary/5"
              )}
            >
              {/* Background progress */}
              {hasVoted && (
                <div 
                  className="absolute inset-0 bg-primary/10 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {option.voted_by_me && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">{option.option_text}</span>
                </div>
                {hasVoted && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        {poll.total_votes} {poll.total_votes === 1 ? 'stem' : 'stemmen'}
        {poll.multiple_choice && ' • Meerdere keuzes'}
        {poll.is_anonymous && ' • Anoniem'}
      </p>
    </div>
  );
}
