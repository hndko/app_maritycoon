import Link from 'next/link';
import { ReactNode } from 'react';
import { Badge } from '../ui/Badge';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-lg font-bold text-white">
              M
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold">MariTycoon</span>
              <span className="block text-xs text-slate-500">Monopoli Indonesia Online</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link className="hidden text-sm font-semibold text-slate-600 hover:text-primary sm:inline" href="/join">
              Join
            </Link>
            <Link className="hidden text-sm font-semibold text-slate-600 hover:text-primary sm:inline" href="/create-room">
              Create
            </Link>
            <Badge tone="green">Realtime</Badge>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
