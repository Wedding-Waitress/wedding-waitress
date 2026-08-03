import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
const url = 'https://xytxkidpourwdbzzwcdp.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dHhraWRwb3Vyd2Rienp3Y2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTMzNTMsImV4cCI6MjA3Mjg4OTM1M30.37m5PSVqAjo51n8CYfDAu0gZr9lGCaAy3NU3PPYxMmI';
const accessToken = process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN || '';
const supabase = createClient(url, key, {
  global: { headers: { Authorization: accessToken ? `Bearer ${accessToken}` : undefined } },
});

const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
if (userErr) { console.error('user error:', userErr.message); process.exit(1); }
console.log('user:', userData.user?.id);
const userId = userData.user?.id;
if (!userId) { console.log('no user'); process.exit(1); }

const slug = 'test-' + Math.random().toString(36).substring(2, 10);
const event = {
  id: uuidv4(),
  user_id: userId,
  name: 'Test Photo Booth Event',
  date: '2026-12-31',
  venue: 'Test Venue',
  slug,
  guest_limit: 100,
  start_time: '18:00:00',
  finish_time: '23:00:00',
  created_at: new Date().toISOString(),
};

const { data: ev, error: evErr } = await supabase.from('events').insert(event).select().single();
if (evErr) { console.error('event insert error:', evErr.message); process.exit(1); }
console.log('event created:', ev.id);

const token = uuidv4().replace(/-/g, '');
const gallery = {
  id: uuidv4(),
  event_id: ev.id,
  user_id: userId,
  primary_token: token,
  is_open: true,
  guest_upload_enabled: true,
  gallery_view_enabled: true,
  guestbook_text_enabled: true,
  photo_booth_enabled: true,
  voice_guestbook_enabled: true,
  max_photos: 100,
  max_videos: 100,
  max_total_bytes: 1000000000,
  max_video_bytes: 100000000,
  max_video_duration_sec: 60,
  max_photo_bytes: 10000000,
  allowed_photo_mimes: ['image/jpeg','image/png','image/heic','image/heif','image/webp'],
  allowed_video_mimes: ['video/mp4','video/quicktime','video/webm'],
  moderation_status: 'approved',
  show_branding: true,
  created_at: new Date().toISOString(),
};

const { data: gal, error: galErr } = await supabase.from('event_media_galleries').insert(gallery).select('primary_token').single();
if (galErr) { console.error('gallery insert error:', galErr.message); process.exit(1); }
console.log('gallery token:', gal.primary_token);
