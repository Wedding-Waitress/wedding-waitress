import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicCopy } from './usePublicCopy';
import { publicEventSentenceSources } from './publicEventSentenceCopy';

// Only public event-manifest names enter this component, never guest/account data.
export function PublicEventSentence({ kind, eventName, children }: {
  kind: 0 | 1 | 2;
  eventName: string;
  children: React.ReactNode;
}) {
  const { i18n } = useTranslation();
  const copy = usePublicCopy();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  if (language === 'en') return <>{children}</>;
  return <>{copy(publicEventSentenceSources[kind]).replace('{{event}}', copy(eventName))}</>;
}
