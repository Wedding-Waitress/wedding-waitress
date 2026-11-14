// A new disposable local PostgreSQL cluster; no application database connection.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync,execFile,spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const bin=path.resolve('work/postgresql-17.11-portable/pgsql/bin');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ww-team-v2-'));
const data=path.join(root,'data'),port='55439';
const sync=(exe,args)=>execFileSync(path.join(bin,exe+'.exe'),args,{windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const base=['-X','-h','127.0.0.1','-p',port,'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'];
const query=sql=>new Promise(resolve=>execFile(path.join(bin,'psql.exe'),[...base,'-At','-c',sql],{windowsHide:true,encoding:'utf8'},(error,stdout,stderr)=>resolve({error,stdout,stderr})));
(async()=>{
 let started=false,server;
 try {
  sync('initdb',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
  const log=fs.openSync(path.join(root,'server.log'),'a');
  server=spawn(path.join(bin,'postgres.exe'),['-D',data,'-p',port,'-h','127.0.0.1'],{windowsHide:true,stdio:['ignore',log,log]});
  for(let i=0;i<60;i++){const probe=await query('SELECT 1');if(!probe.error){started=true;break;}await new Promise(r=>setTimeout(r,250));}if(!started)throw Error('Disposable PostgreSQL did not start: '+fs.readFileSync(path.join(root,'server.log'),'utf8'));
  sync('psql',[...base,'-f',path.resolve('work/team-access-v2/fixture.sql')]);
  // Eight independent connections contend for the same four empty places.
  const responses=await Promise.all(Array.from({length:8},(_,i)=>query(`SELECT internal_create_account_invitation('00000000-0000-0000-0000-000000000001','owner@test.invalid','parallel${i}@test.invalid','Test','Member','+61400000000')`)));
  assert.equal(responses.filter(r=>!r.error).length,4,JSON.stringify(responses));
  assert.ok(responses.filter(r=>r.error).every(r=>r.stderr.includes('occupied or reserved')));
  const count=await query("SELECT count(*) FROM account_invitations WHERE status='pending' AND expires_at>now()");assert.equal(count.stdout.trim(),'4');
  console.log('PASS: eight concurrent invitation transactions on eight PostgreSQL connections reserve exactly four places; four excess invitations rejected. No emails sent.');
 } finally {if(started)sync('pg_ctl',['-D',data,'-m','fast','-w','stop']); else server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
