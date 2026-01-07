interface TypingIndicatorProps {
  typingUsers: { userId: string; username: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const names = typingUsers.map(u => u.username);
  let text = '';

  if (names.length === 1) {
    text = `${names[0]} is aan het typen...`;
  } else if (names.length === 2) {
    text = `${names[0]} en ${names[1]} zijn aan het typen...`;
  } else {
    text = 'Meerdere mensen zijn aan het typen...';
  }

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground animate-pulse">
      <div className="flex items-center gap-2 max-w-3xl mx-auto">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>{text}</span>
      </div>
    </div>
  );
}
