import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, FileText, WifiOff } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

interface MessageInputProps {
  onSend: (content: string, file?: File) => Promise<void>;
  disabled?: boolean;
  onTyping?: () => void;
  isOffline?: boolean;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'application/zip'
];

export function MessageInput({ onSend, disabled, onTyping, isOffline }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || sending) return;

    setSending(true);
    try {
      await onSend(message, selectedFile || undefined);
      setMessage('');
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
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || sending || disabled}
          className="h-11 w-11 p-0 bg-primary text-primary-foreground hover:bg-beacon-lime-glow beacon-glow-sm transition-all duration-300"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
