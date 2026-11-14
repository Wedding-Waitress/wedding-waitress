import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Keep existing English copy/layout contracts meaningful after adding bindings.
// Only the text-only PublicCopy component is projected; surrounding JSX is untouched.
export function readEnglishPublicSource(path: string): string {
  return projectEnglishPublicSource(readFileSync(path, 'utf8'), path);
}

export function projectEnglishPublicSource(input: string, path = 'public.tsx'): string {
  let source = input;
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: { start: number; end: number; text: string }[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'PublicCopy') {
      const attributes = node.attributes.properties;
      if (attributes.length !== 1) throw new Error('PublicCopy projection requires exactly one text prop');
      const prop = attributes[0];
      if (!ts.isJsxAttribute(prop) || prop.name.getText(ast) !== 'text' || !prop.initializer || !ts.isJsxExpression(prop.initializer) || !prop.initializer.expression) throw new Error('Unsupported PublicCopy binding');
      const expression = prop.initializer.expression;
      const text = ts.isStringLiteral(expression)
        ? expression.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        : `{${expression.getText(ast)}}`;
      edits.push({ start: node.getStart(ast), end: node.end, text });
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}
