import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'positive' | 'warning' | 'info';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-white border-[#E8E1D6]',
  positive: 'bg-[#F1F7F1] border-[#D7E7D7]',
  warning: 'bg-[#FBF3E8] border-[#EBD9BD]',
  info: 'bg-[#F4F1EC] border-[#E8E1D6]',
};

const toneText: Record<Tone, string> = {
  neutral: 'text-[#1D1D1F]',
  positive: 'text-[#2F6B2F]',
  warning: 'text-[#8A5A14]',
  info: 'text-[#1D1D1F]',
};

export const InsightCard = ({ label, value, hint, tone = 'neutral' }: Props) => (
  <div className={cn('rounded-xl border p-3', toneStyles[tone])}>
    <div className="text-[11px] uppercase tracking-wide text-[#6E6E73]">{label}</div>
    <div className={cn('text-lg font-semibold mt-0.5', toneText[tone])}>{value}</div>
    {hint && <div className="text-xs text-[#6E6E73] mt-1">{hint}</div>}
  </div>
);

export default InsightCard;
