import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Ban, Trash2, UserCheck } from 'lucide-react';

interface ContactOptionsDialogProps {
  userId: string;
  username: string;
  isBlocked: boolean;
  onBlock: () => Promise<void>;
  onUnblock: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ContactOptionsDialog({
  userId,
  username,
  isBlocked,
  onBlock,
  onUnblock,
  onDelete,
}: ContactOptionsDialogProps) {
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    setLoading(true);
    await onBlock();
    setLoading(false);
    setShowBlockConfirm(false);
  };

  const handleUnblock = async () => {
    setLoading(true);
    await onUnblock();
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    await onDelete();
    setLoading(false);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {isBlocked ? (
            <DropdownMenuItem onClick={handleUnblock} disabled={loading}>
              <UserCheck className="h-4 w-4 mr-2" />
              Deblokkeren
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={() => setShowBlockConfirm(true)}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Blokkeren
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Chat verwijderen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Gebruiker blokkeren</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je <strong>{username}</strong> wilt blokkeren? 
              Je ontvangt geen berichten meer van deze persoon en kun je geen nieuwe gesprekken starten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBlock} 
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Blokkeren...' : 'Blokkeren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Chat verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze chat met <strong>{username}</strong> wilt verwijderen? 
              Je verlaat het gesprek en alle berichten worden voor jou verborgen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Verwijderen...' : 'Verwijderen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
