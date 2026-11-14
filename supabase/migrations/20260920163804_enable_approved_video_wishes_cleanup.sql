-- Explicitly approved by the owner on 21 September 2026.
alter table public.video_wishes_uploads add column cleanup_completed_at timestamptz;
select cron.schedule('video-wishes-cleanup','17 * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='guest_addition_processor_project_url')||'/functions/v1/video-wishes-cleanup',
  headers:=jsonb_build_object('Content-Type','application/json','x-video-wishes-cleanup-secret',(select decrypted_secret from vault.decrypted_secrets where name='video_wishes_cleanup_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=30000
 );
$job$);

