import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, icon, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-xl shadow-sm bg-gradient-to-r from-summer-sky via-summer-lavender to-summer-yellow/10 px-6 py-4 flex items-center justify-between',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && <div className="text-summer-lavender">{icon}</div>}
        <div>
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
