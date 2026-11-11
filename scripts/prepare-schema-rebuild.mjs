// File preparation only. Never connects, runs migrations, or copies hosted config.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { checkRepository } from './check-data-api-permissions.mjs';
export const sha256 = text => crypto.createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex');
export function prepare(root, destination) {
  root = path.resolve(root); destination = path.resolve(destination);
  if (fs.existsSync(destination)) throw new Error('Destination must be a new directory; no existing files are overwritten.');
  const checked = checkRepository(root);
  if (checked.errors.length) throw new Error(checked.errors.join('\n'));
  const evidence = JSON.parse(fs.readFileSync(path.join(root,'supabase/rebuild/recovery-evidence.json'),'utf8'));
  const recovered = evidence.sources.map(source => {
    const sql = fs.readFileSync(path.join(root,'supabase/rebuild/recovered-history',source.file),'utf8');
    if (sql !== source.statements.join('\n')+'\n') throw new Error(`Recovered original differs from hosted migration evidence: ${source.file}`);
    return { ...source, sql, output: source.file.replace(source.version,source.replayVersion) };
  });
  const allFiles = fs.readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.endsWith('.sql'));
  const omitted = evidence.excludedSupersededAttempts || [];
  for(const item of omitted) if(!allFiles.includes(item.file)||!allFiles.includes(item.replacement)) throw new Error('Reviewed failed-attempt/replacement pair changed: '+item.file);
  const files = allFiles.filter(n=>!omitted.some(item=>item.file===n));
  for (const r of recovered) if (files.some(n=>n.startsWith(r.replayVersion))) throw new Error(`Migration version collision: ${r.replayVersion}`);
  const request = '20260906030000_venue_floor_plan_email_requests.sql';
  if (!files.includes(request)) throw new Error('Venue request prerequisite anchor changed; review replay ordering.');
  const dir = path.join(destination,'supabase/migrations'); fs.mkdirSync(dir,{recursive:true});
  const patched = new Map();
  for (const file of files) {
    let sql=fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8');
    const transform=evidence.transforms?.find(t=>t.file===file);
    if(transform){
      sql=sql.replaceAll('\r\n','\n');
      if(!sql.endsWith(transform.expectedTail)) throw new Error('Reviewed hosted-only seed tail changed: '+file);
      sql=sql.slice(0,-transform.expectedTail.length)+transform.replacement;
      patched.set(file,sql);
    }
    fs.writeFileSync(path.join(dir,file),sql);
  }
  for (const r of recovered) fs.writeFileSync(path.join(dir,r.output),r.sql);
  fs.mkdirSync(path.join(destination,'supabase/permissions'));
  // The historical baseline remains authoritative; recovered originals are
  // additional reviewed historical files rather than future feature migrations.
  const baseline = checked.baseline;
  for(const item of omitted) delete baseline.historicalMigrations[item.file];
  for(const [file,sql] of patched) baseline.historicalMigrations[file]=sha256(sql);
  for (const r of recovered) baseline.historicalMigrations[r.output] = sha256(r.sql);
  fs.writeFileSync(path.join(destination,'supabase/permissions/data-api-baseline.json'),JSON.stringify(baseline,null,2)+'\n');
  fs.cpSync(path.join(root,'supabase/rebuild'),path.join(destination,'supabase/rebuild'),{recursive:true});
  fs.writeFileSync(path.join(destination,'supabase/config.toml'),'# DISPOSABLE LOCAL REBUILD ONLY. No hosted project reference or credentials.\nproject_id = "wedding-waitress-rebuild-local"\n');
  const plan = { purpose:'DISPOSABLE LOCAL REBUILD ONLY; never link or push this reconstructed history to production', sourceProject:evidence.projectRef, omitted, transforms:(evidence.transforms||[]).map(t=>({file:t.file,reason:t.reason})), recovered:recovered.map(r=>({sourceVersion:r.version,output:r.output,sha256:sha256(r.sql)})), totalMigrations:files.length+recovered.length };
  fs.writeFileSync(path.join(destination,'rebuild-plan.json'),JSON.stringify(plan,null,2)+'\n');
  const prepared = checkRepository(destination);
  if (prepared.errors.length) throw new Error(prepared.errors.join('\n'));
  return plan;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(!process.argv[2]) throw new Error('Usage: node scripts/prepare-schema-rebuild.mjs <new-disposable-directory>');
  console.log(JSON.stringify(prepare(process.cwd(),process.argv[2]),null,2));
}
