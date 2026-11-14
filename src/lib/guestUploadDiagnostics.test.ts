import { afterEach, expect, it, vi } from 'vitest';
import { recordUploadDiagnostic, uploadFailureDetails } from './guestUploadDiagnostics';
afterEach(() => vi.restoreAllMocks());
it('records only sanitised failure details and bounds stored diagnostics', () => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  sessionStorage.clear();
  const details = uploadFailureDetails({ originalResponse: { getStatus: () => 400 }, code: 'ACCESS_DENIED', message: 'private token and media URL', details: 'private filename' });
  expect(details).toEqual({ status: 400, code: 'ACCESS_DENIED' });
  expect(uploadFailureDetails({ code: 'private token: abc', status: 0 })).toEqual({ status: undefined, code: undefined });
  for (let i = 0; i < 40; i++) recordUploadDiagnostic({ stage: 'transferring', kind: 'video', bytes: 123, outcome: 'error', ...details });
  const saved = sessionStorage.getItem('ww-upload-diagnostics-v1')!;
  expect(JSON.parse(saved)).toHaveLength(30);
  expect(saved).not.toMatch(/private|filename|token|https/);
});
