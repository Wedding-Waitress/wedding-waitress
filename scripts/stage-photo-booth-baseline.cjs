// Read-only immutable production snapshot. Credentials never enter the release directory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const deploy='6ad04e0c22b04fb9dad36e8b';
const root=path.resolve('.codex-deploy-photo-video');
const sha=b=>crypto.createHash('sha1').update(b).digest('hex');
(async()=>{
 const config=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'netlify/Config/config.json'),'utf8'));
 const headers={Authorization:'Bearer '+config.users[config.userId].auth.token};
 const siteResponse=await fetch('https://api.netlify.com/api/v1/sites/61e19ca1-620a-4431-9b50-39d90a8c94b6',{headers});
 if(!siteResponse.ok)throw Error('Cannot read site');
 const site=await siteResponse.json();
 if(site.published_deploy.id!==deploy)throw Error('Published baseline changed; re-audit before proceeding');
 fs.writeFileSync(path.join(root,'site-release-metadata.json'),JSON.stringify({deploy,gitCD:!!site.build_settings?.repo_url,edgeFunctions:site.published_deploy.edge_functions_present}));
 const files=JSON.parse(fs.readFileSync(path.join(root,'live-files.json'),'utf8'));
 const dest=path.join(root,'baseline');fs.mkdirSync(dest,{recursive:true});
 const candidates=['dist','public','work/upload-release','work/upload-production-baseline','work/guest-details-release','.'];
 let next=0,copied=0,downloaded=0;
 await Promise.all(Array.from({length:8},async()=>{
  while(next<files.length){
   const item=files[next++];if(item.path==='/netlify.toml')continue; // Netlify-generated, non-public deploy configuration; CLI regenerates it.
   const relative=item.path.replace(/^\//,'');
   if(relative.includes('..'))throw Error('Unsafe deploy path');
   const target=path.join(dest,relative);fs.mkdirSync(path.dirname(target),{recursive:true});
   if(fs.existsSync(target)&&sha(fs.readFileSync(target))===item.sha){copied++;continue;}
   let bytes;
   if(relative.startsWith('.netlify/internal/edge-functions/')){
    const compiled=path.resolve('.netlify/edge-functions-dist',path.basename(relative));
    if(fs.existsSync(compiled)){const b=fs.readFileSync(compiled);if(sha(b)===item.sha){bytes=b;copied++;}}
   }
   for(const folder of candidates){const candidate=path.resolve(folder,relative);if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile()){const b=fs.readFileSync(candidate);if(sha(b)===item.sha){bytes=b;copied++;break;}}}
   if(!bytes){const r=await fetch(`https://${deploy}--weddingwaitress.netlify.app${item.path}`);if(!r.ok)throw Error('Snapshot HTTP '+r.status+' '+item.path);bytes=Buffer.from(await r.arrayBuffer());if(sha(bytes)!==item.sha)throw Error('Snapshot digest mismatch '+item.path);downloaded++;}
   fs.writeFileSync(target,bytes);
  }
 }));
 console.log(JSON.stringify({baseline:deploy,files:files.length,copied,downloaded,gitCD:!!site.build_settings?.repo_url}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
