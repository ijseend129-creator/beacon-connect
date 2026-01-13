import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface StatusView {
  id: string;
  status_id: string;
  viewer_id: string;
  viewed_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface StatusViewsListProps {
  open: boolean;
  onClose: () => void;
  statusId: string | null;
  getViews: (statusId: string) => Promise<StatusView[]>;
}

export function StatusViewsList({ open, onClose, statusId, getViews }: StatusViewsListProps) {
  const [views, setViews] = useState<StatusView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && statusId) {
      setLoading(true);
      getViews(statusId).then((data) => {
        setViews(data);
        setLoading(false);
      });
    }
  }, [open, statusId, getViews]);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bekeken door</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Laden...</div>
            </div>
          ) : views.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Nog niemand heeft je status bekeken
            </div>
          ) : (
            <div className="space-y-2">
              {views.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={view.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getInitials(view.profile?.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {view.profile?.username || 'Gebruiker'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true, locale: nl })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
