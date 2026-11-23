import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown } from 'lucide-react';

interface MobileLanguageMenuProps {
  languages: readonly { code: string; name: string; flagSrc: string }[];
  currentLanguage: string;
  onChange: (language: string) => void;
  label: string;
}
export const MobileLanguageMenu: React.FC<MobileLanguageMenuProps> = ({ languages, currentLanguage, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 16, width: 190, rowHeight: 32 });
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const anchor = trigger.current;
      const menu = anchor?.closest('[data-public-mobile-menu]');
      if (!anchor || !menu) return;
      const top = menu.getBoundingClientRect().top;
      const width = Math.min(190, window.innerWidth - 32);
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const rowHeight = Math.min(32, Math.max(20, Math.floor((viewportHeight - top - 34) / languages.length)));
      setPosition({ top, left: Math.max(16, Math.min(anchor.getBoundingClientRect().left, window.innerWidth - width - 16)), width, rowHeight });
    };
    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); };
  }, [open, languages.length]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!list.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div data-mobile-language-selector>
    <button ref={trigger} type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen(value => !value)} className="ww-public-control min-h-[44px] min-w-[44px] inline-flex items-center gap-1 rounded-xl px-3">
      <Globe className="w-4 h-4 mr-1" /><span className="text-[14px]">{currentLanguage.toUpperCase()}</span><ChevronDown className="w-3 h-3 ml-1" />
    </button>
    {open && createPortal(<div ref={list} data-mobile-language-list role="group" aria-label={label} className="ww-selector-menu" style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 100, background: '#fff', border: '1px solid #412419', borderRadius: 8, padding: 8, overflow: 'visible', boxShadow: '0 8px 20px rgba(43,23,17,.12)' }}>
      {languages.map(language => <button key={language.code} type="button" data-language-code={language.code} data-selected={currentLanguage === language.code} aria-pressed={currentLanguage === language.code} dir={language.code === 'ar' ? 'rtl' : 'ltr'} className="ww-selector-item flex w-full items-center gap-2 text-left" style={{ height: position.rowHeight, minHeight: position.rowHeight, padding: '0 12px', fontSize: 13, lineHeight: '20px', border: 0, borderRadius: 8 }} onClick={() => { onChange(language.code); setOpen(false); trigger.current?.focus(); }}>
        <img className="ww-language-flag" src={language.flagSrc} alt="" aria-hidden="true" width="18" height="14" /><span>{language.name}</span>
      </button>)}
    </div>, document.body)}
  </div>;
};
