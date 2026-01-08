import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AudioPlayer } from './AudioPlayer';

interface ViewOnceMediaProps {
  messageId: string;
  fileUrl: string;
  fileType: string;
  fileName?: string | null;
  isSent: boolean;
  senderId: string;
}

export function ViewOnceMedia({ 
  messageId, 
  fileUrl, 
  fileType, 
  fileName, 
  isSent,
  senderId 
}: ViewOnceMediaProps) {
  const { user } = useAuth();
  const [viewed, setViewed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if already viewed
  useEffect(() => {
    const checkViewed = async () => {
      if (!user || senderId === user.id) {
        // Sender can always see their own messages
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('message_views')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setViewed(true);
      }
      setLoading(false);
    };

    checkViewed();
  }, [messageId, user, senderId]);

  const handleReveal = async () => {
    if (!user || viewed || senderId === user.id) return;

    // Record the view
    await supabase
      .from('message_views')
      .insert({
        message_id: messageId,
        user_id: user.id,
      });

    setIsRevealed(true);
    
    // Hide after 5 seconds
    setTimeout(() => {
      setIsRevealed(false);
      setViewed(true);
    }, 5000);
  };

  if (loading) {
    return (
      <div className="w-[200px] h-[150px] bg-muted/50 rounded-lg flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Laden...</div>
      </div>
    );
  }

  // Sender can always see their media
  if (senderId === user?.id) {
    return (
      <div className="relative">
        {fileType.startsWith('image/') && (
          <img
            src={fileUrl}
            alt={fileName || 'Afbeelding'}
            className="max-w-[280px] max-h-[200px] rounded-lg object-cover"
          />
        )}
        {fileType.startsWith('audio/') && (
          <AudioPlayer src={fileUrl} isSent={isSent} />
        )}
        <div className="absolute top-2 right-2 bg-background/80 rounded-full px-2 py-1 flex items-center gap-1">
          <EyeOff className="h-3 w-3" />
          <span className="text-xs">1x</span>
        </div>
      </div>
    );
  }

  // Already viewed
  if (viewed && !isRevealed) {
    return (
      <div className="w-[200px] h-[120px] bg-muted/30 rounded-lg flex flex-col items-center justify-center gap-2 border border-border/50">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Media bekeken</p>
      </div>
    );
  }

  // Not yet revealed
  if (!isRevealed) {
    return (
      <button
        onClick={handleReveal}
        className="w-[200px] h-[120px] bg-muted/50 rounded-lg flex flex-col items-center justify-center gap-2 border border-border hover:bg-muted/70 transition-colors cursor-pointer"
      >
        <Eye className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Tik om 1x te bekijken</p>
      </button>
    );
  }

  // Revealed - show content with countdown
  return (
    <div className="relative">
      {fileType.startsWith('image/') && (
        <img
          src={fileUrl}
          alt={fileName || 'Afbeelding'}
          className="max-w-[280px] max-h-[200px] rounded-lg object-cover"
        />
      )}
      {fileType.startsWith('audio/') && (
        <AudioPlayer src={fileUrl} isSent={isSent} />
      )}
      <div className="absolute top-2 right-2 bg-destructive/80 text-destructive-foreground rounded-full px-2 py-1 flex items-center gap-1 animate-pulse">
        <EyeOff className="h-3 w-3" />
        <span className="text-xs">Verdwijnt...</span>
      </div>
    </div>
  );
}
