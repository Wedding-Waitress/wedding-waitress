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
      data-account-section
      className={cn(
        'bg-gradient-to-b from-[#FBF8F2] to-[#F5EBDD] rounded-2xl border border-[#CDB99E] p-6 sm:p-8 transition-shadow shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_10px_25px_rgba(79,48,30,0.10)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_28px_rgba(79,48,30,0.13)]',
        className
      )}
    >
      <header className="flex items-start gap-3 mb-5">
        <div
          data-account-section-icon
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#EDE0D0] text-[#806344] ring-1 ring-[#CDB99E] flex-shrink-0 [&>svg]:!text-[#806344] [&>svg]:!stroke-[#806344]"
        >
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
