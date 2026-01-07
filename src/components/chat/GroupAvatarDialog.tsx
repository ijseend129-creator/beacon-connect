import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Users, Loader2, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupAvatarDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  conversationName: string;
  currentAvatarUrl: string | null;
  onAvatarUpdate: (newUrl: string | null) => void;
  onNameUpdate?: (newName: string) => void;
}

export function GroupAvatarDialog({
  open,
  onClose,
  conversationId,
  conversationName,
  currentAvatarUrl,
  onAvatarUpdate,
  onNameUpdate,
}: GroupAvatarDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const [groupName, setGroupName] = useState(conversationName);
  const [isEditingName, setIsEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPreviewUrl(currentAvatarUrl);
      setGroupName(conversationName);
      setIsEditingName(false);
    }
  }, [open, currentAvatarUrl, conversationName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ongeldig bestandstype',
        description: 'Selecteer een afbeelding (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

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

      const { error: uploadError } = await supabase.storage
        .from('conversation-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('conversation-avatars')
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      setPreviewUrl(newAvatarUrl);
      onAvatarUpdate(newAvatarUrl);

      toast({
        title: 'Groepsfoto bijgewerkt',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Upload mislukt',
        description: 'Kon de foto niet uploaden.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);

    try {
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
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: 'Verwijderen mislukt',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    const trimmedName = groupName.trim();
    
    if (!trimmedName) {
      toast({
        title: 'Ongeldige naam',
        description: 'Voer een groepsnaam in.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName.length > 50) {
      toast({
        title: 'Naam te lang',
        description: 'Maximaal 50 tekens.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName === conversationName) {
      setIsEditingName(false);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ name: trimmedName })
        .eq('id', conversationId);

      if (error) throw error;

      onNameUpdate?.(trimmedName);
      setIsEditingName(false);

      toast({
        title: 'Groepsnaam bijgewerkt',
      });
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: 'Opslaan mislukt',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setGroupName(conversationName);
      setIsEditingName(false);
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
          <DialogTitle>Groepsinstellingen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Avatar Section */}
          <div className="relative">
            <Avatar className="h-32 w-32 bg-secondary">
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt={groupName} />
              ) : null}
              <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                {groupName ? getInitials(groupName) : <Users className="h-12 w-12" />}
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

          {/* Name Section */}
          <div className="w-full space-y-2">
            <Label htmlFor="groupName">Groepsnaam</Label>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  ref={nameInputRef}
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={50}
                  placeholder="Voer groepsnaam in..."
                  disabled={saving}
                />
                <Button 
                  onClick={handleSaveName} 
                  disabled={saving}
                  size="sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Opslaan'}
                </Button>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-2 p-3 rounded-lg border border-input bg-background hover:bg-accent cursor-pointer transition-colors"
              >
                <span className="flex-1 text-foreground">{groupName || 'Naamloos'}</span>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Klik om de groepsnaam te wijzigen
            </p>
          </div>

          {/* Photo Actions */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Nieuwe foto
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
