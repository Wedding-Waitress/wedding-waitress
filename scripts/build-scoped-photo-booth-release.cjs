// Build only the approved Photo Booth sources against the unchanged published runtime.
// Preserve every old asset for existing tabs. Copied JS changes only dependency names.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const esbuild=require('esbuild'),espree=require('espree');
const root=path.resolve('.codex-deploy-photo-video'),baseline=path.join(root,'baseline'),output=path.join(root,'release');
const files=JSON.parse(fs.readFileSync(path.join(root,'live-files.json'),'utf8'));
const jsFiles=files.filter(f=>f.path.startsWith('/assets/')&&f.path.endsWith('.js'));
const suffix='-pb20261015a';
const mapping=new Map(jsFiles.map(f=>{const name=path.basename(f.path);return [name.toLowerCase(),name.replace(/\.js$/,suffix+'.js')];}));
const refs=s=>s.replace(/[A-Za-z0-9_.-]+\.js/g,name=>mapping.get(name.toLowerCase())||name);
const html=fs.readFileSync(path.join(baseline,'index.html'),'utf8');
const main=path.basename(html.match(/src="(\/assets\/index-[^"]+\.js)"/)[1]).toLowerCase();
const booth=jsFiles.find(f=>/guestphotobooth-/i.test(f.path)).path;
const oldBooth=fs.readFileSync(path.join(baseline,booth.slice(1)),'utf8');
const ast=espree.parse(oldBooth,{ecmaVersion:'latest',sourceType:'module'});
const modules=ast.body.filter(n=>n.type==='ImportDeclaration').map(n=>n.source.value);
const find=name=>{const p=modules.find(m=>m.toLowerCase().includes('/'+name.toLowerCase()+'-'));if(!p)throw Error('Missing published dependency '+name);return refs(p);};
const mainRef='./'+mapping.get(main);
let mainSource=fs.readFileSync(path.join(baseline,'assets',main),'utf8');
const mainAst=espree.parse(mainSource,{ecmaVersion:'latest',sourceType:'module',range:true});
const hooks=[];
function walk(node){if(!node||typeof node!=='object')return;
 if(node.type==='VariableDeclarator'&&node.init?.type==='ArrowFunctionExpression'&&mainSource.slice(...node.range).includes('NO_I18NEXT_INSTANCE'))hooks.push(node.id.name);
 for(const v of Object.values(node)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
walk(mainAst);if(hooks.length!==1)throw Error('Cannot identify the existing translation hook '+hooks);
mainSource+='\nexport {'+hooks[0]+' as wwPhotoBoothTranslation};\n';
const copy={};for(const lang of ['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])copy[lang]=JSON.parse(fs.readFileSync(`src/i18n/locales/${lang}/common.json`,'utf8')).photoBoothSession;
const facades={
 react:`import {r as React} from '${mainRef}'; export default React; export const {useEffect,useRef,useState,useCallback}=React;`,
 'react-i18next':`import {wwPhotoBoothTranslation as useLiveTranslation} from '${mainRef}';const resources=${JSON.stringify(copy)};let installed=false;export function useTranslation(ns){const result=useLiveTranslation(ns);if(!installed){for(const [language,photoBoothSession] of Object.entries(resources))result.i18n.addResourceBundle(language,'common',{photoBoothSession},true,true);installed=true;}return result;}`,
 'react-router-dom':`export {u as useParams} from '${mainRef}';`,
 '@/integrations/supabase/client':`export {s as supabase} from '${mainRef}';`,
 '@/components/ui/card':`export {g as Card} from '${mainRef}';`,
 '@/components/ui/button':`export {B as Button} from '${mainRef}';`,
 '@/components/ui/input':`export {I as Input} from '${find('input')}';`,
 '@/components/ui/label':`export {L as Label} from '${find('label')}';`,
 '@/components/SEO/SeoHead':`export {S as SeoHead} from '${find('SeoHead')}';`,
 '@/lib/sharedPhotoFilename':`export {a as safeEventName} from '${find('sharedPhotoFilename')}';`,
 '@/lib/galleryTheme':`export {r as resolveGalleryTheme} from '${find('galleryTheme')}';`,
 '@/lib/galleryTitle':`export {r as resolveGalleryTitle} from '${find('galleryTitle')}';`,
 '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate':`export {G as GalleryPasswordGate,g as galleryPasswordKey} from '${find('galleryTitle')}';`,
 '@/components/Dashboard/PhotoVideoGallery/GalleryFooterLogo':`export {G as GalleryFooterLogo} from '${find('GalleryFooterLogo')}';`,
 './guestMediaUpload.module.css':`export {p as default} from '${find('guestMediaUpload.module')}';`,
 '@/lib/photoBoothTemplate':`export {c as composeStripBlob,f as formatEventDate,P as PB_STRIP_COUNT} from '${find('photoBoothBackgroundTemplates')}';`,
 '@/lib/photoBoothBackgroundTemplates':`export {r as resolvePhotoBoothTemplateSelection} from '${find('photoBoothBackgroundTemplates')}';`,
 'lucide-react':`export {e as Loader2,X} from '${mainRef}';export {C as Camera} from '${find('camera')}';export {C as AlertCircle} from '${find('circle-alert')}';export {R as RotateCcw} from '${find('rotate-ccw')}';export {H as Heart} from '${find('heart')}';export {R as RefreshCw} from '${find('refresh-cw')}';export {D as Download} from '${find('download')}';`,
};
(async()=>{
 const build=await esbuild.build({entryPoints:['src/pages/GuestPhotoBooth.tsx'],bundle:true,write:false,format:'esm',platform:'browser',target:['es2020'],minify:true,metafile:true,
 plugins:[{name:'published-photo-booth-runtime',setup(b){
  b.onResolve({filter:/.*/},args=>{
   if(args.namespace==='published-facade')return {path:args.path,external:true};
   if(facades[args.path])return {path:args.path,namespace:'published-facade'};
   if(args.path.startsWith('@/'))return {path:path.resolve('src',args.path.slice(2)+(path.extname(args.path)?'':'.ts'))};
  });
  b.onLoad({filter:/.*/,namespace:'published-facade'},args=>({contents:facades[args.path],loader:'js'}));
 }}]});
 const bytes=build.outputFiles[0].contents;
 espree.parse(Buffer.from(bytes).toString(),{ecmaVersion:'latest',sourceType:'module'});
 const internal=Object.keys(build.metafile.inputs).filter(n=>!n.startsWith('published-facade:'));
 if(internal.some(n=>!['src/pages/GuestPhotoBooth.tsx','src/hooks/usePhotoBoothUpload.ts','src/assets/photo-booth-bg.png.asset.json'].includes(n.replaceAll('\\','/'))))throw Error('Unapproved source bundled: '+internal);
 fs.mkdirSync(output,{recursive:true});fs.cpSync(baseline,output,{recursive:true});
 for(const file of jsFiles){const name=path.basename(file.path);let source=fs.readFileSync(path.join(baseline,file.path.slice(1)),'utf8');
  if(name.toLowerCase()===main)source=mainSource;
  if(file.path===booth)source=Buffer.from(bytes).toString();else source=refs(source);
  fs.writeFileSync(path.join(output,'assets',mapping.get(name.toLowerCase())),source);
 }
 fs.writeFileSync(path.join(output,'index.html'),refs(html));
 for(const file of files){if(['/index.html','/netlify.toml'].includes(file.path))continue;const p=path.join(output,file.path.slice(1));const sha=crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');if(sha!==file.sha)throw Error('Changed existing asset '+file.path);}
 const audit={baselineDeploy:'6ad04e0c22b04fb9dad36e8b',unchangedFiles:files.length-2,regeneratedNonPublicMetadata:['/netlify.toml'],copiedJsGraph:jsFiles.length,sourceInputs:internal,translationKeys:['photoBoothSession.partial','photoBoothSession.captureFailed'],languages:Object.keys(copy),mainAsset:mapping.get(main),photoBoothAsset:mapping.get(path.basename(booth)),unrelatedSourcePublished:false,migrationsApplied:false,guestbookAssetsUnchanged:true};
 fs.writeFileSync(path.join(root,'release-audit.json'),JSON.stringify(audit,null,2));console.log(JSON.stringify(audit));
})().catch(e=>{console.error(e);process.exitCode=1;});
