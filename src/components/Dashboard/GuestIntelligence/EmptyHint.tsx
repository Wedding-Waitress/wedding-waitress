import { ReactNode } from 'react';

export const EmptyHint = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl border border-dashed border-[#ECE5D8] bg-[#FBF8F2]/60 px-4 py-5 text-center text-[12px] text-[#6E6E73] leading-relaxed">
    {children}
  </div>
);

export default EmptyHint;
