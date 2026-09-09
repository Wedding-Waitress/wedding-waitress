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

delete from vault.secrets
 where name in (
   'guest_addition_processor_project_url',
   'guest_addition_processor_gateway_key',
   'guest_addition_processor_secret'
 );
