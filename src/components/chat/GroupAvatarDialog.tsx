import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Users, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupAvatarDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  conversationName: string;
  currentAvatarUrl: string | null;
  onAvatarUpdate: (newUrl: string | null) => void;
}

export function GroupAvatarDialog({
  open,
  onClose,
  conversationId,
  conversationName,
  currentAvatarUrl,
  onAvatarUpdate,
}: GroupAvatarDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ongeldig bestandstype',
        description: 'Selecteer een afbeelding (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Bestand te groot',
        description: 'Maximale bestandsgrootte is 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('conversation-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('conversation-avatars')
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl;

      // Update conversation in database
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      setPreviewUrl(newAvatarUrl);
      onAvatarUpdate(newAvatarUrl);

      toast({
        title: 'Groepsfoto bijgewerkt',
        description: 'De nieuwe foto is opgeslagen.',
      });

      onClose();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload mislukt',
        description: 'Kon de foto niet uploaden. Probeer opnieuw.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);

    try {
      // Update conversation to remove avatar
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ avatar_url: null })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      setPreviewUrl(null);
      onAvatarUpdate(null);

      toast({
        title: 'Groepsfoto verwijderd',
      });

      onClose();
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'Verwijderen mislukt',
        description: 'Kon de foto niet verwijderen.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Groepsfoto wijzigen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative">
            <Avatar className="h-32 w-32 bg-secondary">
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt={conversationName} />
              ) : null}
              <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                {conversationName ? getInitials(conversationName) : <Users className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Nieuwe foto kiezen
            </Button>
            
            {previewUrl && (
              <Button
                variant="outline"
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Ondersteunde formaten: JPG, PNG, GIF. Max 5MB.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
