import { describe, expect, it } from 'vitest';
import { projectEnglishPublicSource } from './readEnglishPublicSource';

describe('English source contract projection', () => {
  it('preserves surrounding markup and escapes literal text as JSX', () => {
    expect(projectEnglishPublicSource('<h1 className="approved"><PublicCopy text={"A & B < C"} /></h1>'))
      .toBe('<h1 className="approved">A &amp; B &lt; C</h1>');
  });
  it('preserves expressions and does not change other components', () => {
    expect(projectEnglishPublicSource('<p><PublicCopy text={product.title} /><Other text={"Keep"} /></p>'))
      .toBe('<p>{product.title}<Other text={"Keep"} /></p>');
  });
  it('rejects bindings with extra props rather than hiding layout changes', () => {
    expect(() => projectEnglishPublicSource('<PublicCopy text={"Test"} className="changed" />')).toThrow('exactly one text prop');
  });
});
