import { ReactNode } from 'react';
import { Compass } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';

type AppHeaderProps = {
  subtitle: string;
  actions?: ReactNode;
};

export function AppHeader({ subtitle, actions }: AppHeaderProps) {
  return (
    <header className="border-b bg-gradient-card">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary shadow-lg">
              <Compass className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Qwest</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {actions}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}