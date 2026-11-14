import { useTranslation } from 'react-i18next';
import { publicGuestDetailsRows } from './publicGuestDetailsCopy';

export function usePublicGuestDetailsCopy() {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const [save, close, title, warning, keep, discard] = publicGuestDetailsRows[language] || publicGuestDetailsRows.en;
  return { save, close, title, warning, keep, discard };
}
