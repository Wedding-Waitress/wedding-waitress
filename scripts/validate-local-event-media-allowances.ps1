$ErrorActionPreference = 'Stop'
$mediaRoot = Split-Path -Parent $PSScriptRoot
$mediaPsql = Join-Path $mediaRoot 'work/postgresql-17.11-portable/pgsql/bin/psql.exe'
$mediaDefinitions = (Get-Content -Raw (Join-Path $mediaRoot 'supabase/migrations/20260913065740_event_media_upload_allowance_expansion.sql')) -replace '(?m)^BEGIN;\r?\n','' -replace '(?m)^COMMIT;\s*$',''
$mediaGuard = @'
DO $$ BEGIN IF current_database()<>'admin_activity_validation_final' OR inet_server_addr()<>'127.0.0.1'::inet THEN RAISE EXCEPTION 'Local database guard failed'; END IF; END $$;
BEGIN;
'@
$mediaAssertions = @'
CREATE TEMP TABLE media_allowance_fixture (LIKE public.event_media_limits INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
INSERT INTO media_allowance_fixture(event_id) VALUES(gen_random_uuid());
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.event_media_limits WHERE max_photos<>5000 OR max_videos<>100 OR max_video_duration_sec<>300 OR max_total_bytes<>10737418240) THEN RAISE EXCEPTION 'Allowance backfill failed'; END IF;
 IF (SELECT count(*) FROM pg_constraint WHERE conrelid='public.event_media_limits'::regclass AND conname LIKE 'event_media_approved_%_cap')<>4 THEN RAISE EXCEPTION 'Caps missing'; END IF;
 IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='event_media_limits' AND column_name='max_photos')<>'5000' THEN RAISE EXCEPTION 'Photo default failed'; END IF;
 IF EXISTS(SELECT 1 FROM media_allowance_fixture WHERE max_photos<>5000 OR max_videos<>100 OR max_video_duration_sec<>300 OR max_total_bytes<>10737418240) THEN RAISE EXCEPTION 'New event defaults failed'; END IF;
 BEGIN UPDATE media_allowance_fixture SET max_photos=5001; RAISE EXCEPTION 'Photo over-cap accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE media_allowance_fixture SET max_videos=101; RAISE EXCEPTION 'Video over-cap accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE media_allowance_fixture SET max_video_duration_sec=301; RAISE EXCEPTION 'Duration over-cap accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE media_allowance_fixture SET max_total_bytes=10737418241; RAISE EXCEPTION 'Storage over-cap accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
'@
($mediaGuard + $mediaDefinitions + $mediaAssertions) | & $mediaPsql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d admin_activity_validation_final
if ($LASTEXITCODE -ne 0) { throw 'Local media allowance validation failed; connection close rolls back the transaction.' }
