import { Poll } from '@/hooks/usePolls';
import { PollCard } from './PollCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PollListProps {
  polls: Poll[];
  onVote: (pollId: string, optionId: string) => void;
}

export function PollList({ polls, onVote }: PollListProps) {
  if (polls.length === 0) return null;

  return (
    <div className="border-b border-border bg-muted/30">
      <ScrollArea className="w-full">
        <div className="flex gap-3 p-3 overflow-x-auto">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} onVote={onVote} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
