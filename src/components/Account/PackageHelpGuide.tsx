import '@/styles/AccountPurchaseHelp.css';
import React from 'react';
export const PACKAGE_HELP_QUESTIONS = [
 ['How many events and guests are included?', 'Essential includes one event for up to 150 guests, Premium one event for up to 250, and Ultimate one event for up to 450. Each package provides 12 months of access.'],
 ['How do I purchase another event?', 'Use My Events and choose to add another event when your included slots are used. Additional event slots cost A$99 each including 10% GST and require a current paid Essential, Premium or Ultimate plan. The slot is added to your existing account and does not start a separate package term.'],
 ['Where can I use a promo code?', 'An eligible promo code applies only to your first package purchase. It does not discount renewals, upgrades, additional event slots or credit top-ups. Check the offer on the checkout confirmation screen before continuing.'],
 ['Which promotions include Email and SMS credits?', 'At discounts of 50% or less, Essential includes 150 shared credits in the first event, Premium 250 and Ultimate 450. At discounts of 51% to 100%, no new complimentary credits are included. Previously purchased credits remain intact. Additional events receive no new included credits. Sending-credit top-ups can be purchased for each event. Existing granted balances and purchased credits are retained.'],
 ['Are Email and SMS credits separate?', 'Email and SMS use one shared balance for the selected event. One email uses one credit and one SMS uses one credit. Sending both to a guest uses two credits when both contact methods are available. Review the selected recipients and credit requirement before confirming a send.'],
 ['How do I buy more credits?', 'Open the Guest List for your event, select your guests and choose Send RSVP & Invite. Choose Email, SMS or both. If there are not enough credits, the dialog offers 10 shared credits for A$11 or 100 for A$53.90, including 10% GST. Choose a pack to open Stripe checkout. Credits become available after successful payment verification; sending remains blocked until the balance is sufficient.'],
] as const;
export function PackageHelpGuide(){return <section aria-labelledby="package-help-heading" className="mx-auto mb-6 w-full max-w-3xl rounded-xl border border-[#CDB99E] bg-[#FBF8F2] p-6 sm:p-8 text-[#2b1711]">
 <h2 id="package-help-heading" className="text-lg font-bold">Packages, promotions &amp; invitation credits</h2>
 <p className="mt-2 text-sm">Guidance for your Wedding Waitress account. Your verified checkout summary and event credit balance show your specific offer.</p>
 <div className="mt-4 divide-y divide-[#CDB99E]">{PACKAGE_HELP_QUESTIONS.map(([question,answer])=><details key={question} className="py-4"><summary className="cursor-pointer rounded font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#806344]">{question}</summary><p className="mt-3 text-sm leading-6">{answer}</p></details>)}</div>
 </section>;}
