import React from 'react';
import { Search, MailOpen, PlayCircle, LayoutGrid, UtensilsCrossed, MapPin, Music2, Video } from 'lucide-react';
import { publicGuestVerificationSources } from '@/i18n/publicGuestVerificationCopy';
import { publicGuestSeatingSources } from '@/i18n/publicGuestSeatingCopy';
import styles from './GuestSearchGuide.module.css';

/** Small, noninteractive illustrations of GuestLookup's two search phases.
 * Use the real guest copy and warm search-card palette; never query guest data.
 */
function GuestSearchExample({ seating }: { seating: boolean }) {
  const heading = seating ? publicGuestSeatingSources[0] : publicGuestVerificationSources[0];
  return (
    <figure className={styles.example}>
      <figcaption className={styles.phase}>{seating ? 'From 7 days before' : 'More than 7 days before'}</figcaption>
      <div className={styles.screen} role="img" aria-label={seating
        ? 'Example guest app: search Sar, then choose Sarah Wilson or Sarah Miller to find a seat.'
        : 'Example guest app before the seven-day cutoff: enter your full first and last name to begin updating your details.'}>
        <div aria-hidden="true">
          <div className={styles.tray}>
            {[[MailOpen, 'RSVP'], [PlayCircle, 'Welcome'], [LayoutGrid, 'Table'], [UtensilsCrossed, 'Menu'], [MapPin, 'Ceremony Plan'], [MapPin, 'Reception Plan'], [Music2, 'Song Requests'], [Video, 'Video Wishes']].map(([Icon, label]) => {
              const TrayIcon = Icon as typeof Search;
              return <div key={label as string} className={styles.module}><TrayIcon /><div>{label as string}</div></div>;
            })}
          </div>
          <div className={styles.searchCard}>
            <div className={styles.heading}>{heading}</div>
            <div className={styles.search}><Search /><div>{seating ? 'Sar' : 'Sarah Wilson'}</div></div>
            {seating ? <>
              <div className={styles.prompt}>{publicGuestSeatingSources[9]}</div>
              <div className={styles.choice}>Sarah Wilson</div>
              <div className={styles.choice}>Sarah Miller</div>
            </> : <>
              <div className={styles.verification}>{publicGuestVerificationSources[1].split('\n').map(line => <div key={line}>{line}</div>)}<div className={styles.verifyAction}>{publicGuestVerificationSources[2]}</div></div>
            </>}
          </div>
        </div>
      </div>
      <div className={styles.exampleNote}>{seating ? 'First 3 letters → choose your name' : 'Full name → verify → update details'}</div>
    </figure>
  );
}

export function GuestSearchGuide() {
  return (
    <section aria-labelledby="qr-guest-guide-title" className={`rounded-lg border border-border bg-muted/20 p-4 text-sm text-foreground ${styles.panel}`}>
      <div className={styles.layout}>
        <div className={styles.instructions}>
          <h4 id="qr-guest-guide-title" className={styles.title}>Guest Search &amp; Seating</h4>
          <div className={styles.instructionPhase}>
            <h5>More than seven days before your event date</h5>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Enter your full first and last name.</li>
              <li>Tap <strong>Text me a code</strong>. An SMS code is sent to the mobile number saved by the organiser.</li>
              <li>Enter the six-digit code and tap <strong>Verify code</strong> to view your saved details.</li>
              <li>In <strong>Update Your Information</strong>, choose <strong>Accept</strong> or <strong>Decline</strong> for yourself and your invited family members.</li>
              <li>Use <strong>Update</strong> to edit a person’s details, then tap <strong>Save My Details</strong>.</li>
            </ol>
            <p className={styles.invitationNote}><strong>Added security:</strong> Guests verify by SMS before viewing or editing their saved personal details. Personal invitation links use the same verification step.</p>
          </div>
          <div className={styles.instructionPhase}>
            <h5>Seven days out from your event date</h5>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Enter at least the first 3 letters of your first name.</li>
              <li>Choose your own name from the matching names.</li>
              <li>Tap <strong>Table</strong> to see your assigned seat and tablemates.</li>
            </ol>
          </div>
        </div>
        <div className={styles.previews} aria-label="Illustrative guest app views with sample names">
          <GuestSearchExample seating={false} />
          <GuestSearchExample seating />
        </div>
      </div>
    </section>
  );
}
