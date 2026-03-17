

## Issue: Missing `qr_config` column in database

The error is clear from the console log:

> `Could not find the 'qr_config' column of 'invitation_card_settings' in the schema cache`

The code references a `qr_config` column on the `invitation_card_settings` table, but this column was never created in the database. The frontend code and hook were updated to use `qr_config`, but no database migration was run to add the column.

### Fix

Run a single SQL migration to add the column:

```sql
ALTER TABLE public.invitation_card_settings
ADD COLUMN qr_config jsonb DEFAULT '{"enabled": false, "x_percent": 50, "y_percent": 90, "size_percent": 15, "event_id": null}'::jsonb;
```

This adds a `qr_config` JSONB column with sensible defaults matching the `DEFAULT_QR_CONFIG` in the code. No other code changes needed — the existing frontend code will work once the column exists.

