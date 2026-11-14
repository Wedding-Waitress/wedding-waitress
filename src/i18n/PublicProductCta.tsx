import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicCopy } from './usePublicCopy';

// Translate the full authored sentence before inserting an authored product name.
// React escapes both the template and substituted value; this never renders HTML.
export function PublicProductCta({ productName, children }: { productName: string; children: ReactNode }) {
  const { i18n } = useTranslation();
  const copy = usePublicCopy();
  if ((i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] === 'en') return <>{children}</>;
  return <>{copy('Start planning {{product}} in one connected place').replace('{{product}}', copy(productName))}</>;
}
