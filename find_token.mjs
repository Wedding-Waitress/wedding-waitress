import { createClient } from '@supabase/supabase-js';
const url = 'https://xytxkidpourwdbzzwcdp.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dHhraWRwb3Vyd2Rienp3Y2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTMzNTMsImV4cCI6MjA3Mjg4OTM1M30.37m5PSVqAjo51n8CYfDAu0gZr9lGCaAy3NU3PPYxMmI';
const supabase = createClient(url, key);
const { data, error } = await supabase.from('event_media_galleries').select('primary_token, event_id, is_open').limit(1);
if (error) { console.error('error:', error.message); process.exit(1); }
console.log(JSON.stringify(data));
