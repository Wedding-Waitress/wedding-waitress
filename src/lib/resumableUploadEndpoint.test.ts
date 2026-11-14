import { describe, expect, it } from 'vitest';
import { resumableUploadEndpoint } from './resumableUploadEndpoint';
describe('direct storage endpoint', () => {
  it('uses direct storage for hosted Supabase, retaining other deployments', () => {
    expect(resumableUploadEndpoint('https://project-ref.supabase.co')).toBe('https://project-ref.storage.supabase.co/storage/v1/upload/resumable');
    expect(resumableUploadEndpoint('https://project-ref.storage.supabase.co')).toBe('https://project-ref.storage.supabase.co/storage/v1/upload/resumable');
    expect(resumableUploadEndpoint('http://localhost:54321')).toBe('http://localhost:54321/storage/v1/upload/resumable');
    expect(resumableUploadEndpoint('https://api.example.com')).toBe('https://api.example.com/storage/v1/upload/resumable');
  });
});
