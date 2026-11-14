// Structural safeguards, not automatic translation or linguistic approval.
import fs from 'node:fs';
import ts from 'typescript';

const header = fs.readFileSync('src/components/Layout/Header.tsx', 'utf8');
const languages = [...new Set([...header.matchAll(/code:\s*'([a-z]{2})'/g)].map(match => match[1]))];
if (!languages.includes('en') || languages.length < 2) throw new Error('Cannot identify the header language options');
const errors = [];
let catalogues = 0;
const catalogueModules = new Map();
function loadCatalogue(file) {
  if (!/^public[A-Za-z0-9]*Copy\.ts$/.test(file)) throw new Error(`Unsupported catalogue import: ${file}`);
  if (catalogueModules.has(file)) return catalogueModules.get(file);
  const module = { exports: {} };
  catalogueModules.set(file, module.exports);
  const compiled = ts.transpileModule(fs.readFileSync(`src/i18n/${file}`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const requireCatalogue = name => {
    if (!/^\.\/public[A-Za-z0-9]*Copy$/.test(name)) throw new Error(`Unsupported catalogue dependency: ${name}`);
    return loadCatalogue(`${name.slice(2)}.ts`);
  };
  new Function('exports', 'module', 'require', compiled)(module.exports, module, requireCatalogue);
  return module.exports;
}
for (const file of fs.readdirSync('src/i18n').filter(name => /^public.*Copy\.ts$/.test(name))) {
  const module = { exports: loadCatalogue(file) };
  for (const [key, sources] of Object.entries(module.exports).filter(([key]) => key.endsWith('Sources'))) {
    const rows = module.exports[key.replace(/Sources$/, 'Rows')];
    if (!Array.isArray(sources) || !rows) { errors.push(`${file}: ${key} has no matching row catalogue`); continue; }
    catalogues++;
    for (const language of languages) {
      const translations = rows[language];
      if (!Array.isArray(translations) || translations.length !== sources.length) {
        errors.push(`${file}: ${language} must contain ${sources.length} translations`);
        continue;
      }
      sources.forEach((source, index) => {
        const translation = translations[index];
        if (typeof translation !== 'string' || !translation.trim()) errors.push(`${file}: ${language}[${index}] is empty`);
        const tokens = value => [...String(value).matchAll(/\{\{[^}]+\}\}/g)].map(match => match[0]).sort().join('|');
        if (tokens(source) !== tokens(translation)) errors.push(`${file}: ${language}[${index}] changed interpolation placeholders`);
        if (language === 'en' && source !== translation) errors.push(`${file}: English source differs at ${index}`);
      });
    }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Public translation structure passes: ${catalogues} catalogues, ${languages.length} header languages. Source-based tests and browser review remain required.`);
