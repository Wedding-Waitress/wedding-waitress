/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
];

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'footer';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'default',
  className = '' 
}) => {
  const { i18n } = useTranslation();
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`gap-2 ${className}`}
          size={variant === 'compact' ? 'sm' : 'default'}
        >
          {variant === 'footer' ? (
            <>
              <Globe className="w-4 h-4" />
              <span className="text-xs">{currentLanguage.name}</span>
            </>
          ) : variant === 'compact' ? (
            <>
              <span className="text-lg">{currentLanguage.flag}</span>
              <span className="text-xs font-medium">{currentLanguage.code.toUpperCase()}</span>
            </>
          ) : (
            <>
              <span className="text-lg">{currentLanguage.flag}</span>
              <span>{currentLanguage.name}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <ScrollArea className="h-80">
          <div className="p-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm
                  transition-colors duration-200
                  ${
                    i18n.language === language.code
                      ? 'bg-yellow-50 text-gray-900 font-medium'
                      : 'hover:bg-yellow-50 text-gray-700'
                  }
                `}
              >
                <span className="text-xl min-w-[28px]">{language.flag}</span>
                <span className="flex-1 text-left">{language.name}</span>
                {i18n.language === language.code && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
