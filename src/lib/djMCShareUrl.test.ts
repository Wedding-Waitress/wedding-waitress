import { describe, expect, it } from 'vitest';
import { buildDJQuestionnaireUrl } from './urlUtils';

describe('buildDJQuestionnaireUrl', () => {
  it('keeps a generated link on the current application origin', () => {
    expect(buildDJQuestionnaireUrl('token/with+unsafe=', 'Jason & Linda')).toBe(
      `${window.location.origin}/dj-mc/Jason%20%26%20Linda/token%2Fwith%2Bunsafe%3D`,
    );
  });

  it('uses the same canonical route when no event slug is available', () => {
    expect(buildDJQuestionnaireUrl('secure_token')).toBe(
      `${window.location.origin}/dj-mc/secure_token`,
    );
  });
});
