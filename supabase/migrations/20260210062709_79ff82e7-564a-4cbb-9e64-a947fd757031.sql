-- Historical one-time cleanup retired for safe migration replay.
-- Managed Storage objects must be removed through the Storage API, never SQL.
-- Preserve existing files and migration identity; fresh branches need no cleanup.
SELECT 1;
