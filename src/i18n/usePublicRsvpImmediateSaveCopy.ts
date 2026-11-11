import { useTranslation } from 'react-i18next';
import {
  publicRsvpImmediateSaveCopy,
  type PublicRsvpImmediateSaveLanguage,
} from './publicRsvpImmediateSaveCopy';

export function usePublicRsvpImmediateSaveCopy() {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] as PublicRsvpImmediateSaveLanguage;
  return publicRsvpImmediateSaveCopy[language] || publicRsvpImmediateSaveCopy.en;
}
