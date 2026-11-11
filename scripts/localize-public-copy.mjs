// Mechanical JSX wiring only. Run explicitly; never a build-time translation service.
import fs from 'node:fs';
import ts from 'typescript';

const files = [
  'src/pages/Landing.tsx', 'src/pages/Pricing.tsx', 'src/pages/HowItWorks.tsx',
  'src/pages/Products.tsx', 'src/pages/Faq.tsx', 'src/pages/Contact.tsx',
  'src/pages/PrivacyPolicy.tsx', 'src/pages/TermsOfService.tsx', 'src/pages/CookiePolicy.tsx',
  'src/pages/events/PublicEventRoutes.tsx', 'src/pages/products/PublicProductRoutes.tsx',
  'src/components/Layout/ProductPageLayout.tsx', 'src/components/Layout/PublicFooter.tsx',
  'src/components/Layout/PublicPageHero.tsx', 'src/components/auth/AuthModalParts.tsx',
  'src/components/Layout/PublicCinematicHero.tsx', 'src/components/Pricing/PublicPricingSection.tsx',
  'src/components/Pricing/PricingValueComparison.tsx',
  'src/components/Layout/Header.tsx',
  'src/components/auth/SignUpModal.tsx', 'src/components/auth/SignInModal.tsx',
  'src/components/ui/CookieBanner.tsx',
];
function jsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, index) => { if (line.trim()) last = index; });
  return lines.map((line, index) => {
    let text = line.replace(/\t/g, ' ');
    if (index > 0) text = text.replace(/^ +/, '');
    if (index < lines.length - 1) text = text.replace(/ +$/, '');
    return text ? text + (index !== last ? ' ' : '') : '';
  }).join('').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, '\u00a0');
}
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'PublicCopy') {
      for (const attribute of node.attributes.properties) {
        if (ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'text' && attribute.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression && ts.isStringLiteral(attribute.initializer.expression)) {
          const literal = attribute.initializer.expression;
          const decoded = jsxText(literal.text);
          if (decoded !== literal.text) edits.push({ start: literal.getStart(ast), end: literal.end, text: JSON.stringify(decoded) });
        }
      }
      return;
    }
    if (ts.isJsxElement(node) && ['PublicCopy', 'script', 'style', 'code', 'pre'].includes(node.openingElement.tagName.getText(ast))) return;
    if (ts.isJsxText(node)) {
      const text = jsxText(node.getFullText(ast));
      if (/\p{L}/u.test(text)) edits.push({ start: node.getFullStart(), end: node.end, text: `<PublicCopy text={${JSON.stringify(text)}} />` });
    }
    if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      const value = node.expression;
      const fields = new Set(['name', 'shortName', 'lead', 'h1', 'demonstration', 'connects', 'title', 'text', 'label', 'question', 'answer']);
      const identifiers = new Set(['title', 'description', 'eyebrow', 'q', 'a', 'text', 'ctaProductName', 'question', 'answer', 'instruction', 'label', 'headingEventName']);
      if ((ts.isPropertyAccessExpression(value) && value.expression.getText(ast) !== 'lang' && fields.has(value.name.text)) || (ts.isIdentifier(value) && identifiers.has(value.text))) {
        edits.push({ start: node.getStart(ast), end: node.end, text: `<PublicCopy text={${value.getText(ast)}} />` });
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!edits.length) continue;
  for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  if (!source.includes("import { PublicCopy }")) source = "import { PublicCopy } from '@/i18n/PublicCopy';\n" + source;
  fs.writeFileSync(file, source);
  console.log(`${file}: ${edits.length} static text nodes connected`);
}
