import { useState, KeyboardEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, FileText, WifiOff, Mic, Square, BarChart3 } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SchedulePicker } from './SchedulePicker';

interface MessageInputProps {
  onSend: (content: string, file?: File, viewOnce?: boolean, scheduledAt?: Date) => Promise<void>;
  disabled?: boolean;
  onTyping?: () => void;
  isOffline?: boolean;
  isGroup?: boolean;
  onCreatePoll?: () => void;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'application/zip',
  'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav'
];

export function MessageInput({ onSend, disabled, onTyping, isOffline, isGroup, onCreatePoll }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Could not start recording:', error);
      alert('Kon microfoon niet openen. Controleer of je toestemming hebt gegeven.');
    }
  };

  const handleStopRecording = async () => {
    const blob = await stopRecording();
    if (blob) {
      const file = new File([blob], `spraakbericht-${Date.now()}.webm`, { type: 'audio/webm' });
      setSending(true);
      try {
        await onSend('🎤 Spraakbericht', file);
      } finally {
        setSending(false);
      }
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Bestandstype niet ondersteund');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Bestand moet kleiner zijn dan 50MB');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setViewOnce(false);
    setScheduledAt(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || sending) return;

    setSending(true);
    try {
      await onSend(message, selectedFile || undefined, selectedFile ? viewOnce : undefined, scheduledAt || undefined);
      setMessage('');
      setScheduledAt(null);
      clearFile();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  return (
    <div className="p-4 border-t border-border bg-card">
      {isOffline && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Je bent offline. Berichten worden verzonden wanneer je weer online bent.</span>
          </div>
        </div>
      )}
      {selectedFile && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
            {preview ? (
              <img src={preview} alt="Preview" className="h-12 w-12 object-cover rounded" />
            ) : (
              <FileText className="h-6 w-6 text-muted-foreground" />
            )}
            <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
            
            {/* View Once Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={viewOnce}
                  onPressedChange={setViewOnce}
                  size="sm"
                  className={`h-8 w-8 font-bold ${viewOnce ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  1
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p>{viewOnce ? 'Eenmalig bekijken aan' : 'Eenmalig bekijken'}</p>
              </TooltipContent>
            </Tooltip>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isRecording ? (
          // Recording mode
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleCancelRecording}
            >
              <X className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 flex items-center justify-center gap-3 h-11 px-4 bg-destructive/10 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">
                Opnemen... {formatRecordingTime(recordingTime)}
              </span>
            </div>
            
            <Button
              onClick={handleStopRecording}
              className="h-11 w-11 p-0 bg-primary text-primary-foreground hover:bg-beacon-lime-glow beacon-glow-sm transition-all duration-300"
            >
              <Square className="h-4 w-4" />
            </Button>
          </>
        ) : (
          // Normal mode
          <>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled || sending} />
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || sending}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            {isGroup && onCreatePoll && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground"
                onClick={onCreatePoll}
                disabled={disabled || sending || isOffline}
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
            )}
            <SchedulePicker 
              scheduledAt={scheduledAt} 
              onScheduleChange={setScheduledAt} 
              disabled={disabled || sending || isOffline}
            />
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Typ een bericht..."
              disabled={disabled || sending}
              className="min-h-[44px] max-h-[120px] resize-none bg-input border-border focus:ring-primary"
              rows={1}
            />
            {message.trim() || selectedFile ? (
              <Button
                onClick={handleSend}
                disabled={(!message.trim() && !selectedFile) || sending || disabled}
                className="h-11 w-11 p-0 bg-primary text-primary-foreground hover:bg-beacon-lime-glow beacon-glow-sm transition-all duration-300"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={handleStartRecording}
                disabled={disabled || sending || isOffline}
                className="h-11 w-11 p-0 bg-primary text-primary-foreground hover:bg-beacon-lime-glow beacon-glow-sm transition-all duration-300"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
