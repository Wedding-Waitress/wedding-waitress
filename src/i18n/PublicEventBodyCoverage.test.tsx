import React from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicCopy } from './PublicCopy';
import { publicEventTypes } from '../content/publicEventTypes';
import { publicWeddingChallengeRows, publicWeddingChallengeSources } from './publicWeddingChallengeCopy';
import { publicWeddingWorkflowRows, publicWeddingWorkflowSources } from './publicWeddingWorkflowCopy';
import { publicWeddingBenefitRows, publicWeddingBenefitSources } from './publicWeddingBenefitCopy';
import { publicWeddingFaqRows, publicWeddingFaqSources } from './publicWeddingFaqCopy';
import { publicEngagementChallengeRows, publicEngagementChallengeSources } from './publicEngagementChallengeCopy';
import { publicEngagementWorkflowRows, publicEngagementWorkflowSources } from './publicEngagementWorkflowCopy';
import { publicEngagementBenefitRows, publicEngagementBenefitSources } from './publicEngagementBenefitCopy';
import { publicEngagementFaqRows, publicEngagementFaqSources } from './publicEngagementFaqCopy';
import { publicPartyChallengeRows, publicPartyChallengeSources } from './publicPartyChallengeCopy';
import { publicPartyWorkflowRows, publicPartyWorkflowSources } from './publicPartyWorkflowCopy';
import { publicPartyBenefitRows, publicPartyBenefitSources } from './publicPartyBenefitCopy';
import { publicPartyFaqRows, publicPartyFaqSources } from './publicPartyFaqCopy';
import { publicCorporateChallengeRows, publicCorporateChallengeSources } from './publicCorporateChallengeCopy';
import { publicCorporateWorkflowRows, publicCorporateWorkflowSources } from './publicCorporateWorkflowCopy';
import { publicCorporateBenefitRows, publicCorporateBenefitSources } from './publicCorporateBenefitCopy';
import { publicCorporateFaqRows, publicCorporateFaqSources } from './publicCorporateFaqCopy';
import { publicSeasonalChallengeRows, publicSeasonalChallengeSources } from './publicSeasonalChallengeCopy';
import { publicSeasonalWorkflowRows, publicSeasonalWorkflowSources } from './publicSeasonalWorkflowCopy';
import { publicSeasonalBenefitRows, publicSeasonalBenefitSources } from './publicSeasonalBenefitCopy';
import { publicSeasonalFaqRows, publicSeasonalFaqSources } from './publicSeasonalFaqCopy';
import { publicMemorialChallengeRows, publicMemorialChallengeSources } from './publicMemorialChallengeCopy';
import { publicMemorialWorkflowRows, publicMemorialWorkflowSources } from './publicMemorialWorkflowCopy';
import { publicMemorialBenefitRows, publicMemorialBenefitSources } from './publicMemorialBenefitCopy';
import { publicMemorialFaqRows, publicMemorialFaqSources } from './publicMemorialFaqCopy';

const catalogues: Array<readonly [readonly string[], Record<string, readonly string[]>]> = [
  [publicWeddingChallengeSources, publicWeddingChallengeRows],
  [publicWeddingWorkflowSources, publicWeddingWorkflowRows],
  [publicWeddingBenefitSources, publicWeddingBenefitRows],
  [publicWeddingFaqSources, publicWeddingFaqRows],
  [publicEngagementChallengeSources, publicEngagementChallengeRows],
  [publicEngagementWorkflowSources, publicEngagementWorkflowRows],
  [publicEngagementBenefitSources, publicEngagementBenefitRows],
  [publicEngagementFaqSources, publicEngagementFaqRows],
  [publicPartyChallengeSources, publicPartyChallengeRows],
  [publicPartyWorkflowSources, publicPartyWorkflowRows],
  [publicPartyBenefitSources, publicPartyBenefitRows],
  [publicPartyFaqSources, publicPartyFaqRows],
  [publicCorporateChallengeSources, publicCorporateChallengeRows],
  [publicCorporateWorkflowSources, publicCorporateWorkflowRows],
  [publicCorporateBenefitSources, publicCorporateBenefitRows],
  [publicCorporateFaqSources, publicCorporateFaqRows],
  [publicSeasonalChallengeSources, publicSeasonalChallengeRows],
  [publicSeasonalWorkflowSources, publicSeasonalWorkflowRows],
  [publicSeasonalBenefitSources, publicSeasonalBenefitRows],
  [publicSeasonalFaqSources, publicSeasonalFaqRows],
  [publicMemorialChallengeSources, publicMemorialChallengeRows],
  [publicMemorialWorkflowSources, publicMemorialWorkflowRows],
  [publicMemorialBenefitSources, publicMemorialBenefitRows],
  [publicMemorialFaqSources, publicMemorialFaqRows],
];

afterEach(cleanup);
describe('translated event body copy', () => {
  it('covers every current body message in all six event guides', () => {
    const covered = new Set(catalogues.flatMap(([sources]) => [...sources]));
    const actual = publicEventTypes.flatMap(event => [
      ...[...event.challenges, ...event.howItWorks, ...event.benefits, event.example].flatMap(item => [item.title, item.text]),
      ...event.faqs.flatMap(item => [item.question, item.answer]),
    ]);
    expect(actual).toHaveLength(172);
    actual.forEach(text => expect(covered.has(text), text).toBe(true));
  });
  it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])('covers translated actual event body messages in %s', async language => {
    const messages = catalogues.flatMap(([sources]) => [...sources]);
    const expected = catalogues.flatMap(([, rows]) => [...rows[language]]);
    const source = readFileSync('src/content/publicEventTypes.ts', 'utf8');
    messages.forEach(text => expect(source).toContain(text));
    catalogues.forEach(([sources, rows]) => expect(rows[language]).toHaveLength(sources.length));
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{messages.map((text, index) => <span key={index} data-testid={`challenge-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    messages.forEach((text, index) => {
      expect(screen.getByTestId(`challenge-${index}`).textContent).toBe(expected[index]);
      if (language !== 'en') expect(expected[index]).not.toBe(text);
    });
  });
});
