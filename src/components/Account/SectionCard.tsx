// 🔒 LOCKED DASHBOARD UI (2026-04-19) — DO NOT MODIFY without explicit owner approval
// 🔒 PRODUCTION-LOCKED — Account section card shell (2026-04-18)
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  icon: Icon,
  title,
  description,
  children,
  className,
}) => {
  return (
    <section className={cn('dashboard-card', className)}>
      <header className="flex items-start gap-3 mb-6">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#967A59]/10 text-[#967A59] flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] leading-tight tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-[#6E6E73] mt-1">{description}</p>
          )}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
};
