// Fix forward from the verified live snapshot; never publish unrelated dirty source.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const espree = require('espree');
const esbuild = require('esbuild');
const baseline = path.resolve('work/upload-production-baseline');
const output = path.resolve('work/upload-release');
const mainName = 'index-CFWgM6CR.js';
const routeName = 'GuestMediaUpload-UN3xq6Cw.js';
const suffix = '-upload20261011c';
const parse = source => espree.parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
const read = name => fs.readFileSync(path.join(baseline, 'assets', name), 'utf8');
const walk = (node, fn) => {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(n => walk(n, fn));
    else if (value && typeof value === 'object') walk(value, fn);
  }
};
const rename = name => name.toLowerCase().replace(/\.js$/i, `${suffix}.js`);
const names = fs.readdirSync(path.join(baseline, 'assets')).filter(n => n.endsWith('.js'));
const mapping = new Map(names.map(n => [n, rename(n)]));
const mapRefs = source => source.replace(/[A-Za-z0-9_.-]+\.js/g, name => mapping.get(name.toLowerCase()) || name);
const edits = [];
const source = read(routeName);
const ast = parse(source);
const replace = (node, value) => edits.push({ start: node.range[0], end: node.range[1], value });
const component = ast.body.flatMap(n => n.type === 'VariableDeclaration' ? n.declarations : []).find(d => d.id.name === 'na');
if (!component || !source.includes('register_event_media_upload')) throw Error('Unexpected live upload baseline');
for (const name of ['Zs', 'et']) {
  const fn = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name);
  if (!fn) throw Error(`Missing ${name}`);
  replace(fn, '');
}
edits.push({ start: component.init.body.range[0] + 1, end: component.init.body.range[0] + 1, value: 'const {t:wwUploadCopy}=wwUseUploadTranslation("common");' });
let picker = 0, open = 0, change = 0, retry = 0, phase = 0;
walk(component, node => {
  if (node.type === 'VariableDeclarator' && node.id.type === 'ArrayPattern' && node.id.elements[0]?.name === 'N') {
    replace(node, '{awaitingPicker:N,openPicker:wwLaunchPicker,finishPicker:wwFinishPicker}=wwUseFilePicker()'); picker++;
  }
  if (node.type === 'VariableDeclarator' && node.id.name === 'D' && node.init.type === 'CallExpression') {
    replace(node.init, 'o.useCallback(()=>{I(null);wwLaunchPicker(le.current)},[wwLaunchPicker])'); open++;
  }
  if (node.type === 'VariableDeclarator' && node.id.name === 'ce' && node.init.type === 'CallExpression') {
    let value = source.slice(...node.init.range);
    const old = 'if(W.current&&(window.clearTimeout(W.current),W.current=null),n(!1),!s)return;';
    if (!value.includes(old)) throw Error('Unexpected picker callback');
    value = value.replace(old, 'wwFinishPicker();if(!s)return;').replace('I("Your iPhone may still be preparing the video. Please wait, or choose a smaller/local video.")', 'I(null)').replace('[s,y.length])', '[s,y.length,wwFinishPicker])');
    replace(node.init, value); change++;
  }
  if (node.type === 'ObjectExpression') {
    const className = node.properties.find(p => p.key?.name === 'className');
    const children = node.properties.find(p => p.key?.name === 'children');
    if (className?.value.value === 'mt-6 space-y-2.5' && children?.value.type === 'ArrayExpression') {
      edits.push({ start: children.value.range[0] + 1, end: children.value.range[0] + 1, value: 'x.some((p,i)=>p.status==="error"&&y[i]?.ok)&&e.jsx(E,{type:"button",disabled:c,className:`w-full h-12 text-base font-semibold rounded-xl px-3 ${t.successPrimaryAction}`,onClick:Se,children:c?wwUploadCopy("loading"):wwUploadCopy("retry")}),'}); retry++;
    }
    if (className && source.slice(...className.value.range).includes('t.progressLabel') && children) {
      replace(children.value, `V?.phase==="finalizing"?wwUploadCopy("loading"):${source.slice(...children.value.range)}`); phase++;
    }
  }
});
if ([picker, open, change, retry, phase].some(n => n !== 1)) throw Error(`Incomplete upload patch ${[picker,open,change,retry,phase]}`);
let patched = source;
edits.sort((a,b) => b.start - a.start);
for (let i=0;i<edits.length;i++) {
  if (i && edits[i].end > edits[i-1].start) throw Error('Overlapping patches');
  patched = patched.slice(0,edits[i].start) + edits[i].value + patched.slice(edits[i].end);
}
parse(patched);
let main = read(mainName);
let hook;
walk(parse(main), n => {
  if (n.type === 'VariableDeclarator' && n.init?.type === 'ArrowFunctionExpression' && main.slice(...n.range).includes('NO_I18NEXT_INSTANCE')) hook = n.id.name;
});
if (hook !== 'iP') throw Error('Unexpected published translation hook');
main += `\nexport {${hook} as wwUseUploadTranslation};\n`;
async function build() {
  const result = await esbuild.build({
    stdin: { contents: 'export {useGuestMediaUpload} from "./src/hooks/useGuestMediaUpload"; export {useFilePicker} from "./src/hooks/useFilePicker";', resolveDir: process.cwd() },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: ['es2020'], minify: true,
    plugins: [{ name: 'published-runtime', setup(build) {
      build.onResolve({ filter: /^(react|react-i18next|@\/integrations\/supabase\/client)$/ }, args => ({ path: args.path, namespace: 'live-facade' }));
      build.onLoad({ filter: /.*/, namespace: 'live-facade' }, args => ({ contents:
        args.path === 'react' ? `import {r as React} from "./${rename(mainName)}"; export const {useCallback,useEffect,useRef,useState}=React;` :
        args.path === 'react-i18next' ? `export {wwUseUploadTranslation as useTranslation} from "./${rename(mainName)}";` :
        `export {s as supabase,S as SUPABASE_PUBLISHABLE_KEY,b as SUPABASE_URL} from "./${rename(mainName)}";`, loader: 'js' }));
      build.onResolve({ filter: /^\.\/index-.*-upload20261011c\.js$/ }, args => ({ path: args.path, external: true }));
      build.onResolve({ filter: /^@\// }, args => ({ path: path.resolve('src', args.path.slice(2) + '.ts') }));
    } }],
  });
  const runtime = result.outputFiles[0].text;
  const runtimeName = `guest-upload-runtime-${crypto.createHash('sha256').update(runtime).digest('hex').slice(0,12)}.js`;
  patched = `import {useGuestMediaUpload as et,useFilePicker as wwUseFilePicker} from "./${runtimeName}"; import {wwUseUploadTranslation} from "./${rename(mainName)}";\n` + patched;
  fs.mkdirSync(output,{recursive:true});
  fs.cpSync(baseline,output,{recursive:true}); // Old assets preserve already-open pages/uploads.
  fs.writeFileSync(path.join(output,'assets',runtimeName),runtime);
  for (const name of names) {
    const value = mapRefs(name === routeName.toLowerCase() ? patched : name === mainName.toLowerCase() ? main : read(name));
    parse(value);
    fs.writeFileSync(path.join(output,'assets',mapping.get(name)),value);
  }
  fs.writeFileSync(path.join(output,'index.html'),mapRefs(fs.readFileSync(path.join(baseline,'index.html'),'utf8')));
  const preserved = [];
  const scan = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? scan(path.join(dir,e.name)) : [path.join(dir,e.name)]);
  for (const file of scan(baseline)) {
    const relative = path.relative(baseline,file);
    if (relative === 'index.html') continue;
    if (!fs.readFileSync(file).equals(fs.readFileSync(path.join(output,relative)))) throw Error(`Changed baseline file ${relative}`);
    preserved.push(relative);
  }
  const audit = { baselineDeploy:'6ab007d24eab6fdffe3bd170', unchangedOriginalFiles:preserved.length, newJsChunks:names.length, runtimeName, changedFunctionality:['GuestMediaUpload hook, picker cancellation, partial-failure retry, finalising feedback','existing translation-hook export'], unrelatedSourcePublished:false, limitsChanged:false, oldAssetsPreserved:true };
  fs.writeFileSync('artifacts/upload-release-audit.json',JSON.stringify(audit,null,2));
  console.log(JSON.stringify(audit));
}
build().catch(error => { console.error(error);process.exit(1); });
