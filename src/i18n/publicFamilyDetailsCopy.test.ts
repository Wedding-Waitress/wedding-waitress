import { expect, it } from 'vitest';
import { publicFamilyDetailsRows, publicFamilyDetailsSources } from './publicFamilyDetailsCopy';
import { publicRsvpImmediateSaveCopy } from './publicRsvpImmediateSaveCopy';
it('covers every public language for member switching',()=>{
 expect(Object.keys(publicFamilyDetailsRows)).toEqual(Object.keys(publicRsvpImmediateSaveCopy));
 Object.values(publicFamilyDetailsRows).forEach(row=>{expect(row).toHaveLength(publicFamilyDetailsSources.length);row.forEach(text=>expect(text.trim()).not.toBe(''));});
});
