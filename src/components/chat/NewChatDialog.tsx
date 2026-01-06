import { useState } from 'react';
import { useUsers, UserProfile } from '@/hooks/useUsers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Search, Users } from 'lucide-react';

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateChat: (userIds: string[], name?: string, isGroup?: boolean) => Promise<void>;
}

export function NewChatDialog({ open, onClose, onCreateChat }: NewChatDialogProps) {
  const { users, loading } = useUsers();
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    try {
      await onCreateChat(
        selectedUsers,
        isGroup ? groupName : undefined,
        selectedUsers.length > 1 || isGroup
      );
      // Reset state
      setSelectedUsers([]);
      setGroupName('');
      setIsGroup(false);
      setSearch('');
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>

          {/* Group chat toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isGroup"
              checked={isGroup}
              onCheckedChange={(checked) => setIsGroup(!!checked)}
            />
            <Label htmlFor="isGroup" className="text-sm text-foreground cursor-pointer">
              Create a group chat
            </Label>
          </div>

          {/* Group name input */}
          {isGroup && (
            <Input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="bg-input border-border"
            />
          )}

          {/* Selected users count */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Users className="h-4 w-4" />
              <span>{selectedUsers.length} selected</span>
            </div>
          )}

          {/* User list */}
          <ScrollArea className="h-[200px] border border-border rounded-lg">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`w-full p-2 rounded-lg flex items-center gap-3 transition-colors ${
                      selectedUsers.includes(user.id)
                        ? 'bg-primary/20 border border-primary'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <Avatar className="h-10 w-10 bg-secondary">
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground">{user.username}</span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Create button */}
          <Button
            onClick={handleCreate}
            disabled={
              selectedUsers.length === 0 ||
              (isGroup && !groupName.trim()) ||
              creating
            }
            className="w-full bg-primary text-primary-foreground hover:bg-beacon-lime-glow"
          >
            {creating ? 'Sending Invite...' : 'Send Invite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
