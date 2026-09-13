$ErrorActionPreference = 'Stop'
$promotionRoot = Split-Path -Parent $PSScriptRoot
$promotionCli = 'C:/Users/User__/AppData/Local/npm-cache/_npx/66b4952730d9cac8/node_modules/@supabase/cli-windows-x64/bin/supabase.exe'
$promotionRef = (Get-Content -Raw (Join-Path $promotionRoot 'supabase/.temp/project-ref')).Trim()
if ($promotionRef -ne 'xytxkidpourwdbzzwcdp') { throw 'Hosted project scope mismatch' }
$promotionDump = Join-Path $promotionRoot 'work/postgresql-17.11-portable/pgsql/bin/pg_dump.exe'
$promotionBackup = Join-Path $promotionRoot ('work/production-backups/wedding_waitress_prod_schema_pre_promotions_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.sql')
$promotionPrevious = @{}
try {
  # CLI obtains a temporary database login. Keep connection values in memory only.
  $ErrorActionPreference = 'Continue'
  $promotionScript = & $promotionCli db dump --linked --dry-run 2>$null
  $ErrorActionPreference = 'Stop'
  if ($LASTEXITCODE -ne 0) { throw 'Could not obtain backup connection configuration' }
  $promotionCount = 0
  foreach ($promotionLine in $promotionScript) {
    if ($promotionLine -match '^export (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)="([^"`$]*)"$') {
      $promotionKey = $Matches[1]
      $promotionPrevious[$promotionKey] = [Environment]::GetEnvironmentVariable($promotionKey,'Process')
      [Environment]::SetEnvironmentVariable($promotionKey,$Matches[2],'Process')
      $promotionCount++
    }
  }
  if ($promotionCount -ne 5) { throw 'Unrecognized connection configuration; no backup attempted' }
  & $promotionDump --schema-only --quote-all-identifiers --role postgres --file $promotionBackup
  if ($LASTEXITCODE -ne 0) { throw 'Schema backup failed' }
  $promotionInfo = Get-Item -LiteralPath $promotionBackup
  if ($promotionInfo.Length -lt 10000 -or -not (Select-String -LiteralPath $promotionBackup -SimpleMatch 'PostgreSQL database dump complete' -Quiet)) { throw 'Incomplete schema backup' }
  [pscustomobject]@{ Path=$promotionInfo.FullName; Bytes=$promotionInfo.Length; SHA256=(Get-FileHash -LiteralPath $promotionBackup -Algorithm SHA256).Hash }
} finally {
  foreach ($promotionKey in $promotionPrevious.Keys) { [Environment]::SetEnvironmentVariable($promotionKey,$promotionPrevious[$promotionKey],'Process') }
  $promotionScript = $null
}
