import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  onAnswer: () => void;
  onDecline: () => void;
}

export function IncomingCallDialog({
  open,
  callerName,
  onAnswer,
  onDecline,
}: IncomingCallDialogProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md bg-card border-border [&>button]:hidden">
        <div className="flex flex-col items-center py-6">
          <div className="relative mb-6">
            <Avatar className="h-24 w-24 bg-secondary">
              <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
                {getInitials(callerName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Incoming Call
          </h2>
          <p className="text-muted-foreground mb-8">{callerName}</p>
          
          <div className="flex gap-8">
            <Button
              onClick={onDecline}
              size="lg"
              className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              onClick={onAnswer}
              size="lg"
              className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
