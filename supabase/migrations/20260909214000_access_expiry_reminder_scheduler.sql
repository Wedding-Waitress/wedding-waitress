-- Activate only after process-access-expiry-reminders and the three reviewed
-- Vault values are present. Runs hourly; the database claim is idempotent and
-- only prepares reminders for the current paid expiry exactly 30 days out.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$ begin
  perform cron.unschedule('process-access-expiry-reminders');
exception when others then null;
end $$;

select cron.schedule(
  'process-access-expiry-reminders',
  '17 * * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='access_expiry_processor_project_url') || '/functions/v1/process-access-expiry-reminders',
    headers := jsonb_build_object(
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='access_expiry_processor_gateway_key'),
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name='access_expiry_processor_gateway_key'),
      'x-access-expiry-processor-secret',(select decrypted_secret from vault.decrypted_secrets where name='access_expiry_processor_secret'),
      'Content-Type','application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );$$
);

do $$ begin
  perform cron.unschedule('purge-expired-access-accounts');
exception when others then null;
end $$;

select cron.schedule(
  'purge-expired-access-accounts',
  '45 3 * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='access_expiry_processor_project_url') || '/functions/v1/purge-expired-access-accounts',
    headers := jsonb_build_object(
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='access_expiry_processor_gateway_key'),
      'apikey',(select decrypted_secret from vault.decrypted_secrets where name='access_expiry_processor_gateway_key'),
      'x-access-recovery-cleanup-secret',(select decrypted_secret from vault.decrypted_secrets where name='access_recovery_cleanup_secret'),
      'Content-Type','application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );$$
);
