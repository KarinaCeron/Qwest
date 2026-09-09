import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsBell } from '@/components/NotificationsBell';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { CircleHelp, User, FileText, LogOut, Briefcase, MessageSquareText, ListChecks, Target } from 'lucide-react';

export const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    toast({ title: '👋 Signed out' });
    navigate('/auth');
  };

  return (
    <div className="flex items-center gap-2">
      <NotificationsBell />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Avatar className="h-10 w-10 border-2 border-primary/20 hover:border-primary/50 transition-colors">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                {(user.email?.[0] ?? 'U').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Signed in as</p>
              <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">My Qwest</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate('/cv')} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            My Qwest
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/target-companies')} className="cursor-pointer">
            <Target className="mr-2 h-4 w-4" />
            My Target Companies
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer">
            <Briefcase className="mr-2 h-4 w-4" />
            My Job Apps
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/tasks')} className="cursor-pointer">
            <ListChecks className="mr-2 h-4 w-4" />
            My Pending Tasks
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">Resources</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate('/templates')} className="cursor-pointer">
            <MessageSquareText className="mr-2 h-4 w-4" />
            My Templates
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/questions')} className="cursor-pointer">
            <CircleHelp className="mr-2 h-4 w-4" />
            Question Bank
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">Settings</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
