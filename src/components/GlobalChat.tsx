import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChatWindow } from '@/components/ChatWindow';

const HIDDEN_ROUTES = ['/auth', '/reset-password'];

export function GlobalChat() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user || HIDDEN_ROUTES.includes(pathname)) return null;
  return <ChatWindow />;
}
