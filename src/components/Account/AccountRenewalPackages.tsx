import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PLAN_DETAILS, type PlanKey } from '@/lib/upgradePlans';
import { PACKAGE_CHECKOUT_AVAILABLE, PACKAGE_CHECKOUT_NOTICE, gstInclusiveAud } from '@/lib/packagePricing';

/** No checkout side effects on mount/login. Only an explicit consented link. */
export const AccountRenewalPackages: React.FC<{reason?:'paid-expired'|'trial-ended'}> = ({reason='paid-expired'}) => {
  const [selected, setSelected] = useState<PlanKey>('essential');
  const [consented, setConsented] = useState(false);
  return <section aria-labelledby="renewal-packages-title">
    <h2 id="renewal-packages-title">Choose your renewal package</h2>
    <p>{reason==='trial-ended'?'Your seven-day trial has ended.':'Your original paid term has ended.'} Your saved information remains retained; paid access resumes only after a successful, verified payment.</p>
    <fieldset>
      <legend>Existing Wedding Waitress packages</legend>
      {Object.values(PLAN_DETAILS).map(plan => <label key={plan.key} style={{ display: 'block', margin: '12px 0' }}>
        <input type="radio" name="renewal-package" value={plan.key} checked={selected === plan.key}
          onChange={() => { setSelected(plan.key); setConsented(false); }} />
        {' '}{plan.name} — A${plan.price_aud} excluding GST
        <span style={{ display: 'block' }}>{plan.description}. Australian total including GST: A${gstInclusiveAud(plan.price_aud)}.</span>
      </label>)}
    </fieldset>
    <label><input type="checkbox" checked={consented} onChange={event => setConsented(event.target.checked)} />{' '}
      I choose {PLAN_DETAILS[selected].name} and agree to continue to checkout. Logging in will not charge me.</label>
    {PACKAGE_CHECKOUT_AVAILABLE && consented
      ? <p><Link to={`/account-renewal-checkout?plan=${selected}&purpose=renewal`}>Continue to renewal checkout</Link></p>
      : <p><button type="button" disabled>Continue to renewal checkout</button></p>}
    {!PACKAGE_CHECKOUT_AVAILABLE && <p role="status">{PACKAGE_CHECKOUT_NOTICE}</p>}
  </section>;
};
