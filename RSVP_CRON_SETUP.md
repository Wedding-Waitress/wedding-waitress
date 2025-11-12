# 🔄 RSVP Reminders Cron Job Setup Guide

This guide explains how to set up automated RSVP reminder scheduling and daily summaries using Supabase Cron Jobs.

---

## 📋 Prerequisites

1. **Supabase Project**: Your project must have `pg_cron` and `pg_net` extensions enabled
2. **Edge Functions Deployed**: Both `schedule-auto-reminders` and `daily-rsvp-summary` functions must be deployed
3. **Service Role Key**: You'll need your Supabase Service Role Key (⚠️ keep this secret!)

---

## 🔧 Setup Instructions

### Step 1: Enable Required Extensions

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Get Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/xytxkidpourwdbzzwcdp/settings/api
2. Copy the `service_role` key (NOT the `anon` key)
3. ⚠️ **NEVER** commit this key to your codebase

### Step 3: Schedule Auto-Reminders Job

This job runs **every hour** to check if any events need automated reminders sent.

```sql
SELECT cron.schedule(
  'schedule-auto-reminders-hourly',
  '0 * * * *', -- Every hour at :00
  $$
  SELECT
    net.http_post(
        url:='https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/schedule-auto-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
```

**⚠️ IMPORTANT**: Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key!

---

### Step 4: Schedule Daily Summary Job

This job runs **once daily at 8:00 AM UTC** to send RSVP summary emails.

```sql
SELECT cron.schedule(
  'daily-rsvp-summary',
  '0 8 * * *', -- Daily at 8:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/daily-rsvp-summary',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
```

**⚠️ IMPORTANT**: Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key!

---

## 🕐 Timezone Considerations

### Understanding UTC vs Local Time

- **Cron jobs run in UTC** (Coordinated Universal Time)
- If you want the daily summary to run at 8 AM in **Australian Eastern Time (AEDT/AEST)**:
  - AEDT (UTC+11): Set cron to `21 * * *` (9 PM UTC = 8 AM AEDT)
  - AEST (UTC+10): Set cron to `22 * * *` (10 PM UTC = 8 AM AEST)

### Example: 8 AM Australian Time

```sql
SELECT cron.schedule(
  'daily-rsvp-summary-8am-australia',
  '0 22 * * *', -- 10 PM UTC = 8 AM AEST
  $$
  SELECT
    net.http_post(
        url:='https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/daily-rsvp-summary',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
```

---

## 🔍 Verify Jobs Are Running

### List All Scheduled Jobs

```sql
SELECT * FROM cron.job;
```

### View Job Execution History

```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Check for Errors

```sql
SELECT * FROM cron.job_run_details 
WHERE status = 'failed' 
ORDER BY start_time DESC;
```

---

## 🗑️ Remove/Update Jobs

### Delete a Job

```sql
SELECT cron.unschedule('schedule-auto-reminders-hourly');
SELECT cron.unschedule('daily-rsvp-summary');
```

### Update Job Schedule

You must delete the old job and create a new one:

```sql
-- Delete old job
SELECT cron.unschedule('daily-rsvp-summary');

-- Create new job with different schedule
SELECT cron.schedule(
  'daily-rsvp-summary',
  '0 6 * * *', -- Now runs at 6 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/daily-rsvp-summary',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
```

---

## 📊 Cron Schedule Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Examples

| Schedule | Description |
|----------|-------------|
| `0 * * * *` | Every hour at :00 |
| `0 8 * * *` | Daily at 8:00 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * 1` | Every Monday at 9:00 AM |
| `30 18 * * 1-5` | Weekdays at 6:30 PM |

---

## ✅ Testing

### Manual Trigger (for testing)

You can manually test the edge functions using the Supabase dashboard or `curl`:

```bash
# Test auto-reminders
curl -X POST \
  'https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/schedule-auto-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"time": "2025-11-12T10:00:00Z"}'

# Test daily summary
curl -X POST \
  'https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/daily-rsvp-summary' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"time": "2025-11-12T08:00:00Z"}'
```

---

## 🚨 Security Notes

1. **Service Role Key**: Never expose this in client-side code or commit to Git
2. **Cron Jobs**: Only accessible via SQL, not through the REST API
3. **Edge Functions**: Ensure they validate the request source
4. **Rate Limiting**: Consider adding rate limits to prevent abuse

---

## 📖 Resources

- [Supabase Cron Jobs Documentation](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [pg_cron GitHub Repository](https://github.com/citusdata/pg_cron)
- [Cron Expression Validator](https://crontab.guru/)

---

## 🎯 Summary

After setup, your system will:

✅ Check for pending auto-reminders **every hour**
✅ Send daily RSVP summaries **at 8 AM** (your timezone)
✅ Log all execution history in Supabase
✅ Handle errors gracefully with retry logic

**Next Steps:**
1. Run the SQL commands above in Supabase SQL Editor
2. Wait for the next scheduled time
3. Check `cron.job_run_details` to verify execution
4. Monitor edge function logs for any issues

🎉 Your automated RSVP system is now complete!