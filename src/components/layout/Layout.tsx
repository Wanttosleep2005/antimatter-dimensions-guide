import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Starfield } from '../effects/Starfield';
import { BlackHole } from '../effects/BlackHole';

interface LayoutProps {
  children: ReactNode;
  onOpenSearch: () => void;
  onOpenTool: () => void;
}

export function Layout({ children, onOpenSearch, onOpenTool }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-x-hidden w-full max-w-full">
      <Starfield />
      <BlackHole />
      <Sidebar onOpenTool={onOpenTool} />
      <div className="lg:ml-[var(--sidebar-width)] transition-[margin] duration-300 relative z-[1]">
        <Header onOpenSearch={onOpenSearch} />
        <main className="min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
