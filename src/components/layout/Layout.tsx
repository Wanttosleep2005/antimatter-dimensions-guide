import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Starfield } from '../effects/Starfield';
import { BlackHole } from '../effects/BlackHole';

interface LayoutProps {
  children: ReactNode;
  onOpenSearch: () => void;
  getStatus: (id: number) => 'not-started' | 'in-progress' | 'completed';
  perfMode?: 'low' | 'normal';
}

export function Layout({ children, onOpenSearch, getStatus, perfMode }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-x-hidden w-full max-w-full">
      <Starfield perfMode={perfMode} />
      <BlackHole />
      <Sidebar getStatus={getStatus} />
      <div className="lg:ml-[var(--sidebar-width)] transition-[margin] duration-300 relative z-[1]">
        <Header onOpenSearch={onOpenSearch} />
        <main className="min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
