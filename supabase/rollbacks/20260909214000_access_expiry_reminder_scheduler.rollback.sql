do $$ begin
  perform cron.unschedule('process-access-expiry-reminders');
exception when others then null;
end $$;

do $$ begin
  perform cron.unschedule('purge-expired-access-accounts');
exception when others then null;
end $$;
