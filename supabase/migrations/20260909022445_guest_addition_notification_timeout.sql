-- Allow a bounded Edge cold-start window while retaining the two-minute
-- processing cadence. The processor remains authenticated by the dedicated
-- scheduler secret stored in Vault.

select cron.unschedule('process-guest-addition-notifications');

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
