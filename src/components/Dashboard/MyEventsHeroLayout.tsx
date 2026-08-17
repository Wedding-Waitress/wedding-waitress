import React from 'react';
import styles from './MyEventsPage.module.css';

interface MyEventsHeroLayoutProps {
  hasCeremony: boolean;
  hasReception: boolean;
  ceremony?: React.ReactNode;
  countdown: React.ReactNode;
  reception?: React.ReactNode;
}

export const MyEventsHeroLayout: React.FC<MyEventsHeroLayoutProps> = ({
  hasCeremony,
  hasReception,
  ceremony,
  countdown,
  reception,
}) => {
  const layout = hasCeremony && hasReception
    ? 'both'
    : hasCeremony
      ? 'ceremony-only'
      : hasReception
        ? 'reception-only'
        : 'countdown-only';

  return (
    <div className={styles.heroLayout} data-layout={layout}>
      {hasCeremony && ceremony ? <div className={styles.ceremonySlot}>{ceremony}</div> : null}
      <div className={styles.countdownSlot}>{countdown}</div>
      {hasReception && reception ? <div className={styles.receptionSlot}>{reception}</div> : null}
    </div>
  );
};
