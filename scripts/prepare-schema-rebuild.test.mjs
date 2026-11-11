import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prepare,sha256 } from './prepare-schema-rebuild.mjs';
import { checkRepository } from './check-data-api-permissions.mjs';

test('rebuild preparation preserves source history and excludes hosted configuration',()=>{
  const root=process.cwd();
  const evidence=JSON.parse(fs.readFileSync(path.join(root,'supabase/rebuild/recovery-evidence.json'),'utf8'));
  const hashes=Object.fromEntries(fs.readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.endsWith('.sql')).map(n=>[n,sha256(fs.readFileSync(path.join(root,'supabase/migrations',n),'utf8'))]));
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ww-rebuild-preparation-'));
  try{
    const destination=path.join(temp,'disposable');
    const plan=prepare(root,destination);
    assert.equal(plan.recovered.length,evidence.sources.length);
    assert.equal(plan.omitted.length,evidence.excludedSupersededAttempts.length);
    assert.deepEqual(checkRepository(destination).errors,[]);
    assert.equal(fs.existsSync(path.join(destination,'supabase/.temp')),false);
    assert.equal(fs.existsSync(path.join(destination,'.env')),false);
    const config=fs.readFileSync(path.join(destination,'supabase/config.toml'),'utf8');
    assert.ok(config.includes('wedding-waitress-rebuild-local'));
    assert.equal(config.includes(evidence.projectRef),false);
    for(const [file,digest] of Object.entries(hashes))assert.equal(sha256(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8')),digest,'original file unchanged: '+file);
    for(const item of plan.omitted)assert.equal(fs.existsSync(path.join(destination,'supabase/migrations',item.file)),false);
    for(const item of evidence.transforms){
      const sql=fs.readFileSync(path.join(destination,'supabase/migrations',item.file),'utf8');
      assert.equal(sql.includes(item.expectedTail),false);
      assert.ok(sql.includes('CREATE TABLE public.user_roles'),'mixed schema DDL is preserved');
    }
    const venue=plan.recovered.find(s=>s.sourceVersion==='20260906025447');
    assert.ok(venue.output>'20260906030000_venue_floor_plan_email_requests.sql','venue interest follows FK parent creation');
    assert.throws(()=>prepare(root,destination),/new directory/);
  }finally{
    const resolved=path.resolve(temp);
    assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('ww-rebuild-preparation-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
