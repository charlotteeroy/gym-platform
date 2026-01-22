'use client';

import { ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function Header({ title, description, children }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-slate-50/80 backdrop-blur-sm px-4 md:px-6 border-b border-slate-200/60">
      <div className="min-w-0">
        <h1 className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-200/60">
          <Bell className="h-5 w-5 text-slate-600" />
        </Button>
      </div>
    </header>
  );
}
