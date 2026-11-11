import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {TrialLimitChoice,formatTrialDate} from './TrialLimitChoice';
it('shows the account trial dates, cap and upgrade action without altering entitlement',()=>{
 const stay=vi.fn(),choose=vi.fn();
 const start='2026-11-01T22:30:00Z',end='2026-11-08T22:30:00Z';
 render(<TrialLimitChoice open trialStartedAt={start} trialEndsAt={end} onContinue={stay} onChoosePackage={choose}/>);
 for(const text of ['7-day free trial','Up to 20 guests','Maximum 5 tables',formatTrialDate(start),formatTrialDate(end)])expect(screen.getByText(text)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Continue my free trial'}));expect(stay).toHaveBeenCalledTimes(1);expect(choose).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Upgrade Now'}));expect(choose).toHaveBeenCalledTimes(1);
});
it('formats the stored instants in the user local timezone and never invents missing dates',()=>{
 const iso='2026-11-01T22:30:00Z';
 expect(formatTrialDate(iso)).toBe(new Date(iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}));
 expect(formatTrialDate(null)).toBe('Unavailable');expect(formatTrialDate('bad')).toBe('Unavailable');
});
