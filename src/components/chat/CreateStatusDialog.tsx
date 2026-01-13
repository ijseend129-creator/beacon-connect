import { useState, useRef } from 'react';
import { X, Image, Mic, BarChart3, Type, Palette, Send, Square, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

type StatusType = 'text' | 'image' | 'audio' | 'poll';

const BACKGROUND_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#1e293b', // dark
];

interface CreateStatusDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateStatus: (data: {
    content?: string;
    mediaFile?: File;
    mediaType?: 'image' | 'audio';
    pollQuestion?: string;
    pollOptions?: string[];
    backgroundColor?: string;
  }) => Promise<boolean>;
}

export function CreateStatusDialog({ open, onClose, onCreateStatus }: CreateStatusDialogProps) {
  const [statusType, setStatusType] = useState<StatusType>('text');
  const [content, setContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  const handleStopRecording = async () => {
    const blob = await stopRecording();
    if (blob) {
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const resetForm = () => {
    setStatusType('text');
    setContent('');
    setBackgroundColor(BACKGROUND_COLORS[0]);
    setImageFile(null);
    setImagePreview(null);
    setPollQuestion('');
    setPollOptions(['', '']);
    handleCancelRecording();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStatusType('image');
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let success = false;

      if (statusType === 'text' && content.trim()) {
        success = await onCreateStatus({
          content: content.trim(),
          backgroundColor,
        });
      } else if (statusType === 'image' && imageFile) {
        success = await onCreateStatus({
          content: content.trim() || undefined,
          mediaFile: imageFile,
          mediaType: 'image',
        });
      } else if (statusType === 'audio' && audioBlob) {
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
        success = await onCreateStatus({
          content: content.trim() || undefined,
          mediaFile: audioFile,
          mediaType: 'audio',
        });
      } else if (statusType === 'poll' && pollQuestion.trim()) {
        const validOptions = pollOptions.filter(o => o.trim());
        if (validOptions.length >= 2) {
          success = await onCreateStatus({
            pollQuestion: pollQuestion.trim(),
            pollOptions: validOptions,
            backgroundColor,
          });
        }
      }

      if (success) {
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (isSubmitting) return false;
    
    switch (statusType) {
      case 'text':
        return content.trim().length > 0;
      case 'image':
        return imageFile !== null;
      case 'audio':
        return audioBlob !== null;
      case 'poll':
        return pollQuestion.trim().length > 0 && pollOptions.filter(o => o.trim()).length >= 2;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Nieuwe status</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2 p-4 border-b border-border">
          <Button
            variant={statusType === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusType('text')}
          >
            <Type className="h-4 w-4 mr-1" />
            Tekst
          </Button>
          <Button
            variant={statusType === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-4 w-4 mr-1" />
            Foto
          </Button>
          <Button
            variant={statusType === 'audio' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusType('audio')}
          >
            <Mic className="h-4 w-4 mr-1" />
            Audio
          </Button>
          <Button
            variant={statusType === 'poll' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusType('poll')}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Poll
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Content area */}
        <div className="p-4 min-h-[300px]">
          {statusType === 'text' && (
            <div className="space-y-4">
              <div
                className="rounded-lg p-6 min-h-[200px] flex items-center justify-center"
                style={{ backgroundColor }}
              >
                <Textarea
                  placeholder="Typ je status..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bg-transparent border-none text-white text-xl text-center resize-none placeholder:text-white/50 focus-visible:ring-0"
                  maxLength={500}
                />
              </div>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {BACKGROUND_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform",
                        backgroundColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setBackgroundColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {statusType === 'image' && (
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-[300px] object-contain rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  className="w-full h-[200px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-12 w-12" />
                  <span>Klik om een foto te selecteren</span>
                </button>
              )}
              <Input
                placeholder="Voeg een beschrijving toe..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}

          {statusType === 'audio' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
                {audioUrl ? (
                  <>
                    <audio src={audioUrl} controls className="w-full" />
                    <Button variant="outline" onClick={handleCancelRecording}>
                      Opnieuw opnemen
                    </Button>
                  </>
                ) : isRecording ? (
                  <>
                    <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                      <Mic className="h-10 w-10 text-destructive" />
                    </div>
                    <p className="text-muted-foreground">Opnemen...</p>
                    <Button variant="destructive" onClick={handleStopRecording}>
                      <Square className="h-4 w-4 mr-2" />
                      Stop opname
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                      onClick={startRecording}
                    >
                      <Mic className="h-10 w-10 text-primary" />
                    </button>
                    <p className="text-muted-foreground">Tik om te starten met opnemen</p>
                  </>
                )}
              </div>
              <Input
                placeholder="Voeg een beschrijving toe..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}

          {statusType === 'poll' && (
            <div className="space-y-4">
              <div
                className="rounded-lg p-4 space-y-3"
                style={{ backgroundColor }}
              >
                <Input
                  placeholder="Stel een vraag..."
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                />
                {pollOptions.map((option, index) => (
                  <Input
                    key={index}
                    placeholder={`Optie ${index + 1}`}
                    value={option}
                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                  />
                ))}
                {pollOptions.length < 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handleAddPollOption}
                  >
                    + Optie toevoegen
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {BACKGROUND_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform",
                        backgroundColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setBackgroundColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <Button onClick={handleSubmit} disabled={!canSubmit()}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Plaatsen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
