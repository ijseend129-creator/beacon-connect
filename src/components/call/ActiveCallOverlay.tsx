import { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ActiveCallOverlayProps {
  participantName: string;
  isGroup: boolean;
  isMuted: boolean;
  onEndCall: () => void;
  onToggleMute: () => void;
}

export function ActiveCallOverlay({
  participantName,
  isGroup,
  isMuted,
  onEndCall,
  onToggleMute,
}: ActiveCallOverlayProps) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="relative mb-6">
          <Avatar className="h-32 w-32 bg-secondary">
            <AvatarFallback className="text-3xl bg-secondary text-secondary-foreground">
              {isGroup ? <Users className="h-12 w-12" /> : getInitials(participantName)}
            </AvatarFallback>
          </Avatar>
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full animate-pulse bg-primary/10" />
        </div>
        
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {participantName}
        </h2>
        <p className="text-primary text-lg mb-12">
          {formatDuration(duration)}
        </p>
        
        <div className="flex gap-6">
          <Button
            onClick={onToggleMute}
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            className="h-16 w-16 rounded-full"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <Button
            onClick={onEndCall}
            size="lg"
            className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
        
        {isMuted && (
          <p className="text-muted-foreground mt-4 text-sm">
            You are muted
          </p>
        )}
      </div>
    </div>
  );
}
