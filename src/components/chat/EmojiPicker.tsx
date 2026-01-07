import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '🤔', '🤗', '🤭', '😎'],
  },
  {
    name: 'Gebaren',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🤚', '✋', '🖐️', '👏', '🙌', '🤝', '🙏', '💪', '❤️', '🔥', '⭐'],
  },
  {
    name: 'Objecten',
    emojis: ['📱', '💻', '🎮', '📷', '🎵', '🎬', '📚', '✏️', '📌', '💡', '🔑', '🏠', '🚗', '✈️', '🎁', '🎉', '🎂', '☕', '🍕', '🍔'],
  },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        {/* Category tabs */}
        <div className="flex gap-1 mb-2 border-b border-border pb-2">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <Button
              key={cat.name}
              variant={selectedCategory === idx ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs px-2 py-1 h-7"
              onClick={() => setSelectedCategory(idx)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
        
        {/* Emoji grid */}
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
