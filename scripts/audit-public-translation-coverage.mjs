// Read-only inventory of literal PublicCopy bindings. Dynamic content and props
// require separate review: this report must never be treated as full-page proof.
import fs from 'node:fs';
import ts from 'typescript';
const normalize = text => text.replace(/\s+/g, ' ').trim().toLowerCase();
const known = new Set();
function index(value) {
  if (typeof value === 'string') known.add(normalize(value));
  else if (value && typeof value === 'object') Object.values(value).forEach(index);
}
for (const namespace of ['common', 'landing']) index(JSON.parse(fs.readFileSync(`src/i18n/locales/en/${namespace}.json`, 'utf8')));
for (const name of fs.readdirSync('src/i18n').filter(name => /^public.*Copy\.ts$/.test(name)).map(name => name.slice(0, -3))) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(`src/i18n/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('exports', 'module', compiled)(module.exports, module);
  for (const [key, value] of Object.entries(module.exports)) if (key.endsWith('Sources')) index(value);
}
for (const brand of ['Wedding Waitress', 'Marketing King Australia', 'Essential', 'Premium', 'Ultimate']) known.add(normalize(brand));
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${directory}/${entry.name}`) : entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [`${directory}/${entry.name}`] : []);
}
let literals = 0, dynamic = 0;
const missing = new Map();
for (const file of [...files('src/pages'), ...files('src/components/Layout'), ...files('src/components/auth'), ...files('src/components/Pricing'), 'src/components/ui/CookieBanner.tsx']) {
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'PublicCopy') {
      const attribute = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(ast) === 'text');
      const value = attribute?.initializer && ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : null;
      if (value && ts.isStringLiteral(value)) {
        literals++;
        if (!known.has(normalize(value.text))) {
          const references = missing.get(value.text) || [];
          references.push(file);
          missing.set(value.text, references);
        }
      } else dynamic++;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
console.log(JSON.stringify({ literalBindings: literals, dynamicBindingsNeedingSeparateAudit: dynamic, missingUniqueLiteralSources: missing.size, missing: [...missing].map(([text, references]) => ({ text, files: [...new Set(references)] })) }, null, 2));
