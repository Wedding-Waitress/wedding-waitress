-- Invoke the service-role-only organiser alert processor every two minutes.
-- Runtime credentials are read from Supabase Vault and are never stored in
-- this migration. Provider calls still occur only for independently opted-in,
-- atomically claimed future notifications.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('process-guest-addition-notifications');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('cleanup-organiser-phone-otp-challenges');
exception when others then null;
end $$;

select cron.schedule(
  'process-guest-addition-notifications',
  '*/2 * * * *',
  $$select net.http_post(
    url := (
      select decrypted_secret
        from vault.decrypted_secrets
       where name = 'guest_addition_processor_project_url'
    ) || '/functions/v1/process-guest-addition-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'guest_addition_processor_gateway_key'
      ),
      'apikey', (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'guest_addition_processor_gateway_key'
      ),
      'x-guest-addition-processor-secret', (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'guest_addition_processor_secret'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );$$
);

select cron.schedule(
  'cleanup-organiser-phone-otp-challenges',
  '25 3 * * *',
  $$delete from public.organiser_phone_otp_challenges where created_at < now() - interval '24 hours';$$
);
