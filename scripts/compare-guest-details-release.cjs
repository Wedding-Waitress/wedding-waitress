const fs = require('node:fs');
const path = require('node:path');
const espree = require('espree');
const scope = require('eslint-scope');
function withoutBindingNames(source) {
  const ast = espree.parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const scopes = scope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  let next = 0;
  for (const block of scopes.scopes) for (const variable of block.variables) {
    const name = `binding_${next++}`;
    for (const node of variable.identifiers) node.name = name;
    for (const ref of variable.references) ref.identifier.name = name;
  }
  return JSON.stringify(ast, (key,value) => ['start','end','range','raw'].includes(key) ? undefined : value);
}
const oldDir = 'dist/assets';
const newDir = 'work/guest-details-release/assets';
const normalize = text => text.replace(/-[A-Za-z0-9_-]{8}(?=\.(?:js|css|png|jpg|webp|svg|woff2?))/g, '-HASH');
const groups = dir => {
  const html = fs.readFileSync(path.join(dir, '../index.html'), 'utf8');
  const main = html.match(/src="\/assets\/(index-[^"]+\.js)"/)[1];
  const mainText = fs.readFileSync(path.join(dir, main), 'utf8');
  const exportText = mainText.slice(mainText.lastIndexOf('export{') + 7).split('}')[0];
  const exports = Object.fromEntries(exportText.split(',').map(item => { const [local, alias = local] = item.split(' as '); return [alias, local]; }));
  const canonical = (name, source) => {
    source = source.replace(/import\{([^}]+)\}from"\.\/([^"]+)"/g, (statement, members, target) => target === main
      ? `import{${members.split(',').map(item => { const [key, binding] = item.split(' as '); return `${exports[key] || key} as ${binding || key}`; }).join(',')}}from"./${target}"` : statement);
    if (name === main) source = source.slice(0, source.lastIndexOf('export{')) + `export{${Object.values(exports).sort().join(',')}};`;
    return normalize(source);
  };
  const result = new Map();
  for (const name of fs.readdirSync(dir).filter(name => /\.(js|css)$/.test(name))) {
    const key = normalize(name);
    const values = result.get(key) || [];
    values.push({ name, normalized: canonical(name, fs.readFileSync(path.join(dir, name), 'utf8')) });
    result.set(key, values);
  }
  return result;
};
const old = groups(oldDir), fresh = groups(newDir), changed = [];
for (const [key, values] of fresh) {
  for (const value of values) if (!(old.get(key) || []).some(before => before.normalized === value.normalized || (key.endsWith('.js') && withoutBindingNames(before.normalized) === withoutBindingNames(value.normalized)))) {
    changed.push(value.name);
    if (process.argv.includes('--details')) {
      const prior = (old.get(key) || []).sort((a,b) => Math.abs(a.normalized.length-value.normalized.length)-Math.abs(b.normalized.length-value.normalized.length))[0];
      let i=0; while(prior && prior.normalized[i]===value.normalized[i] && i<value.normalized.length) i++;
      console.log(JSON.stringify({name:value.name,before:prior?.normalized.slice(Math.max(0,i-30),i+130),after:value.normalized.slice(Math.max(0,i-30),i+130)}));
    }
  }
}
console.log(JSON.stringify({ changedBeyondAssetHashes: changed }, null, 2));
