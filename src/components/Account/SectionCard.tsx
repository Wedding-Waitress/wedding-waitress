// 🔒 PRODUCTION-LOCKED — Account section card shell (2026-04-25)
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
        'bg-gradient-to-b from-white to-[#FBF7F0] rounded-2xl border border-[#E8E1D6]/70 p-6 sm:p-8 transition-shadow shadow-[0_2px_8px_-2px_rgba(150,122,89,0.10),0_8px_24px_-12px_rgba(150,122,89,0.18)] hover:shadow-[0_4px_12px_-2px_rgba(150,122,89,0.14),0_12px_32px_-12px_rgba(150,122,89,0.26)]',
        className
      )}
    >
      <header className="flex items-start gap-3 mb-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A87A]/25 to-[#967A59]/15 text-[#7d6649] ring-1 ring-[#967A59]/15 flex-shrink-0">
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
