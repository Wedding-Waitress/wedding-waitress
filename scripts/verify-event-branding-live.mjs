import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required.');

const ownerId = '10000000-0000-0000-0000-000000000011';
const viewerId = '10000000-0000-0000-0000-000000000012';
const draftId = '20000000-0000-0000-0000-000000000011';
const eventId = '30000000-0000-0000-0000-000000000011';
const password = 'EventBranding-Verification-2026!';
const ownerEmail = 'event-branding-live-owner@example.invalid';
const viewerEmail = 'event-branding-live-viewer@example.invalid';
const bucket = 'event-branding';
const prefix = `${ownerId}/`;

const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const owner = client();
const viewer = client();
const anonymous = client();
const results = [];
const createdPaths = new Set();

const check = (condition, name, detail = '') => {
  if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
  results.push(name);
};

const bytes = (size, signature) => {
  const value = new Uint8Array(size);
  value.set(signature);
  return value;
};

const upload = async (actor, path, body, contentType, upsert = false) => {
  const response = await actor.storage.from(bucket).upload(path, body, { contentType, upsert });
  if (!response.error) createdPaths.add(path);
  return response;
};

const objectExists = async (actor, path) => {
  const { data, error } = await actor.storage.from(bucket).download(path);
  return !error && Boolean(data);
};

const objectListed = async (actor, path) => {
  const separator = path.lastIndexOf('/');
  const directory = path.slice(0, separator);
  const filename = path.slice(separator + 1);
  const { data, error } = await actor.storage.from(bucket).list(directory, { search: filename, limit: 10 });
  return !error && Boolean(data?.some((item) => item.name === filename));
};

const clearPointers = async () => {
  await owner.from('onboarding_drafts').update({ answers: {} }).eq('id', draftId);
  await owner.from('events').update({ event_image_path: null }).eq('id', eventId);
};

const cleanupObjects = async () => {
  await clearPointers();
  if (createdPaths.size) await owner.storage.from(bucket).remove([...createdPaths]);
};

try {
  const ownerSignIn = await owner.auth.signInWithPassword({ email: ownerEmail, password });
  check(!ownerSignIn.error && ownerSignIn.data.user?.id === ownerId, 'owner authentication', ownerSignIn.error?.message);
  const viewerSignIn = await viewer.auth.signInWithPassword({ email: viewerEmail, password });
  check(!viewerSignIn.error && viewerSignIn.data.user?.id === viewerId, 'viewer authentication', viewerSignIn.error?.message);

  const draftPath = `${prefix}drafts/${draftId}/photo.JPG`;
  const eventPath = `${prefix}events/${eventId}/logo.png`;
  const draftPointer = await owner.from('onboarding_drafts').update({
    answers: { eventImagePath: draftPath, eventImageFit: 'cover', eventImagePositionX: 50, eventImagePositionY: 50 },
  }).eq('id', draftId).select('id').single();
  check(!draftPointer.error, 'draft pointer prepared', draftPointer.error?.message);
  const eventPointer = await owner.from('events').update({ event_image_path: eventPath, event_image_fit: 'contain' }).eq('id', eventId).select('id').single();
  check(!eventPointer.error, 'event pointer prepared', eventPointer.error?.message);
  const jpeg = bytes(768 * 1024, [0xff, 0xd8, 0xff]);
  const replacementJpeg = bytes(1100 * 1024, [0xff, 0xd8, 0xff]);

  let response = await upload(owner, draftPath, jpeg, 'image/jpeg');
  check(!response.error, 'owner draft upload', response.error?.message);
  response = await upload(owner, draftPath, replacementJpeg, 'image/jpeg', true);
  check(!response.error, 'owner draft replacement upsert', response.error?.message);
  check(await objectExists(owner, draftPath), 'owner draft preview');
  check(!(await objectExists(viewer, draftPath)), 'private draft rejects another user read');
  check(!(await objectExists(anonymous, draftPath)), 'private draft rejects anonymous read');

  const resumed = await owner.from('onboarding_drafts').select('answers,current_step').eq('id', draftId).single();
  check(!resumed.error && resumed.data?.answers?.eventImagePath === draftPath, 'draft survives refresh and resume', resumed.error?.message);

  response = await upload(owner, eventPath, bytes(1024, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png');
  check(!response.error, 'event owner upload', response.error?.message);
  response = await upload(owner, eventPath, bytes(2048, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png', true);
  check(!response.error, 'event owner replacement', response.error?.message);

  response = await upload(viewer, `${prefix}events/${eventId}/viewer.jpg`, jpeg, 'image/jpeg');
  check(Boolean(response.error), 'viewer event upload rejected');
  response = await upload(viewer, eventPath, jpeg, 'image/jpeg', true);
  check(Boolean(response.error), 'viewer event update rejected');
  const viewerDelete = await viewer.storage.from(bucket).remove([eventPath]);
  check(Boolean(viewerDelete.error) || await objectExists(owner, eventPath), 'viewer event deletion rejected');
  check(await objectExists(owner, eventPath), 'viewer cannot remove owner event object');

  response = await upload(anonymous, `${prefix}events/${eventId}/anonymous.jpg`, jpeg, 'image/jpeg');
  check(Boolean(response.error), 'anonymous upload rejected');

  let removal = await owner.storage.from(bucket).remove([draftPath]);
  check(Boolean(removal.error) || await objectExists(owner, draftPath), 'referenced draft delete rejected');
  check(await objectExists(owner, draftPath), 'referenced draft object retained');
  removal = await owner.storage.from(bucket).remove([eventPath]);
  check(Boolean(removal.error) || await objectExists(owner, eventPath), 'referenced event delete rejected');
  check(await objectExists(owner, eventPath), 'referenced event object retained');

  const reposition = await owner.from('events').update({
    event_image_fit: 'cover', event_image_position_x: 35, event_image_position_y: 65,
  }).eq('id', eventId).select('event_image_fit,event_image_position_x,event_image_position_y').single();
  check(!reposition.error && reposition.data?.event_image_position_x === 35 && reposition.data?.event_image_position_y === 65, 'owner reposition and fit persistence', reposition.error?.message);
  const viewerReposition = await viewer.from('events').update({ event_image_position_x: 99 }).eq('id', eventId).select('id');
  check(!viewerReposition.error && viewerReposition.data?.length === 0, 'viewer event metadata update rejected');

  const pngPath = `${prefix}drafts/${draftId}/format.PNG`;
  response = await upload(owner, pngPath, bytes(1024, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png');
  check(!response.error, 'PNG accepted', response.error?.message);
  const webpPath = `${prefix}drafts/${draftId}/format.WeBp`;
  response = await upload(owner, webpPath, bytes(1024, [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]), 'image/webp');
  check(!response.error, 'WebP accepted', response.error?.message);
  const exactLimitPath = `${prefix}drafts/${draftId}/five-megabytes.jpeg`;
  response = await upload(owner, exactLimitPath, bytes(5 * 1024 * 1024, [0xff, 0xd8, 0xff]), 'image/jpeg');
  check(!response.error, 'JPEG at 5 MB accepted', response.error?.message);

  response = await upload(owner, `${prefix}drafts/${draftId}/invalid.txt`, bytes(32, [0x4d, 0x5a]), 'text/plain');
  check(Boolean(response.error), 'invalid MIME rejected');
  response = await upload(owner, `${prefix}drafts/${draftId}/oversized.jpg`, bytes(5 * 1024 * 1024 + 1, [0xff, 0xd8, 0xff]), 'image/jpeg');
  check(Boolean(response.error), 'file over 5 MB rejected');

  await clearPointers();
  removal = await owner.storage.from(bucket).remove([draftPath, eventPath]);
  check(!removal.error, 'unreferenced owner objects removed', removal.error?.message);
  createdPaths.delete(draftPath);
  createdPaths.delete(eventPath);
  check(!(await objectListed(owner, draftPath)) && !(await objectListed(owner, eventPath)), 'cleared objects removed from storage');
} finally {
  await cleanupObjects();
  await owner.auth.signOut();
  await viewer.auth.signOut();
}

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
