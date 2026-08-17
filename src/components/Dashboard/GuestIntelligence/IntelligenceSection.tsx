import { ReactNode } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string | number;
  badgeTone?: 'neutral' | 'warning';
  children: ReactNode;
}

export const IntelligenceSection = ({
  value,
  title,
  description,
  icon,
  badge,
  badgeTone = 'neutral',
  children,
}: Props) => (
  <AccordionItem
    value={value}
    className={cn(
      'ww-intelligence-section border border-[#ECE5D8] rounded-2xl bg-white overflow-hidden',
      'transition-shadow duration-200 data-[state=open]:shadow-[0_2px_12px_-4px_rgba(150,122,89,0.18)]'
    )}
  >
    <AccordionTrigger className="hover:no-underline px-4 sm:px-5 py-3.5 group">
      <div className="flex items-center gap-3 flex-1 text-left min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[#FAF4EA] flex items-center justify-center text-[#967A59] shrink-0 transition-colors group-hover:bg-[#F4EDE0]">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold text-[#1D1D1F] leading-tight tracking-tight">
            {title}
          </div>
          {description && (
            <div className="text-[11.5px] text-[#6E6E73] mt-0.5 truncate">{description}</div>
          )}
        </div>
        {badge !== undefined && badge !== '' && (
          <span
            className={cn(
              'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 tracking-wide',
              badgeTone === 'warning'
                ? 'bg-[#FBF4E8] text-[#8A5A14] border border-[#EDDDC0]'
                : 'bg-[#FAF4EA] text-[#967A59] border border-[#ECE5D8]'
            )}
          >
            {badge}
          </span>
        )}
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4 sm:px-5 pb-4 pt-0">
      <div className="pt-1">{children}</div>
    </AccordionContent>
  </AccordionItem>
);

export default IntelligenceSection;
