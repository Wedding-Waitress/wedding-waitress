import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'positive' | 'warning' | 'info';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-white border-[#ECE5D8]',
  positive: 'bg-[#F4F9F4] border-[#DCEBDC]',
  warning: 'bg-[#FBF4E8] border-[#EDDDC0]',
  info: 'bg-[#FAF6EF] border-[#ECE5D8]',
};

const toneText: Record<Tone, string> = {
  neutral: 'text-[#1D1D1F]',
  positive: 'text-[#2F6B2F]',
  warning: 'text-[#8A5A14]',
  info: 'text-[#1D1D1F]',
};

export const InsightCard = ({ label, value, hint, tone = 'neutral' }: Props) => (
  <div
    className={cn(
      'rounded-xl border px-3 py-2.5 min-h-[68px] flex flex-col justify-center transition-colors',
      toneStyles[tone],
    )}
  >
    <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium leading-none">
      {label}
    </div>
    <div className={cn('text-[17px] font-semibold mt-1.5 leading-none tabular-nums', toneText[tone])}>
      {value}
    </div>
    {hint && <div className="text-[11px] text-[#6E6E73] mt-1.5 leading-snug">{hint}</div>}
  </div>
);

export default InsightCard;
