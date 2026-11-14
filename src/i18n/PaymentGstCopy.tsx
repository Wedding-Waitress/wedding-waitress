import { useTranslation } from 'react-i18next';
import { publicGstRows, publicGstSources } from './publicGstCopy';

/** Payment-only catalogue bridge; does not alter dashboard language or public routing. */
export function usePublicGstCopy() {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const rows = publicGstRows[language];
  if (!rows) throw new Error(`Missing GST translations for ${language}`);
  return (text: typeof publicGstSources[number]) => rows[publicGstSources.indexOf(text)];
}

export function PublicGstCopy({ text }: { text: typeof publicGstSources[number] }) {
  const copy = usePublicGstCopy();
  return <>{copy(text)}</>;
}
