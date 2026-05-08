import { ReactNode } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: string | number;
  children: ReactNode;
}

export const IntelligenceSection = ({ value, title, description, icon, badge, children }: Props) => (
  <AccordionItem value={value} className="border border-[#E8E1D6] rounded-2xl bg-white px-3 sm:px-4 data-[state=open]:shadow-sm">
    <AccordionTrigger className="hover:no-underline py-3.5">
      <div className="flex items-center gap-3 flex-1 text-left">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[#FBF7F2] flex items-center justify-center text-[#967A59] shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#1D1D1F] leading-tight">{title}</div>
          {description && (
            <div className="text-xs text-[#6E6E73] mt-0.5 line-clamp-1">{description}</div>
          )}
        </div>
        {badge !== undefined && badge !== '' && (
          <span className={cn(
            'text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F4F1EC] text-[#967A59] shrink-0'
          )}>
            {badge}
          </span>
        )}
      </div>
    </AccordionTrigger>
    <AccordionContent className="pb-4 pt-1">
      {children}
    </AccordionContent>
  </AccordionItem>
);

export default IntelligenceSection;
