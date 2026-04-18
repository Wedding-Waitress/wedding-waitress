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
    <section
      className={cn(
        'bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(150,122,89,0.12)] border border-[#E8E1D6]/60 p-6 sm:p-8 transition-shadow hover:shadow-[0_4px_20px_-6px_rgba(150,122,89,0.18)]',
        className
      )}
    >
      <header className="flex items-start gap-3 mb-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#967A59]/10 text-[#967A59] flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
};
