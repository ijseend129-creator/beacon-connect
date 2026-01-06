import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';
import { BeaconLogo } from '@/components/BeaconLogo';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';

interface UserMenuProps {
  username?: string;
  avatarUrl?: string;
  onProfileUpdate?: (username: string, avatarUrl: string | null) => void;
}

export function UserMenu({ username, avatarUrl, onProfileUpdate }: UserMenuProps) {
  const { signOut, user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileUpdate = (newUsername: string, newAvatarUrl: string | null) => {
    onProfileUpdate?.(newUsername, newAvatarUrl);
  };

  return (
    <>
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BeaconLogo size="sm" />
          <span className="text-lg font-bold text-sidebar-foreground">Beacon</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
              <Avatar className="h-10 w-10 bg-secondary">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {getInitials(username || user?.email || 'U')}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            <DropdownMenuItem className="text-popover-foreground cursor-default">
              <User className="h-4 w-4 mr-2" />
              {username || user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => setShowSettings(true)}
              className="cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileSettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        currentUsername={username}
        currentAvatarUrl={avatarUrl}
        onUpdate={handleProfileUpdate}
      />
    </>
  );
}
