import {describe,it,expect} from 'vitest';
import {publicProducts} from './publicProducts';
import {pricingComparisonRows,estimatedSeparateToolValueAud} from './pricingComparison';
import {readFileSync} from 'node:fs';
describe('Photo Group List public discovery',()=>{
 it('uses a working public information route in the shared catalogue',()=>{expect(publicProducts.find(p=>p.id==='photo-callout-cards')).toMatchObject({path:'/photo-group-list',group:'Event-Day Planning'});expect(readFileSync('src/App.tsx','utf8')).toContain('<Route path="/photo-group-list" element={<ProductPhotoGroupList />} />');expect(readFileSync('src/pages/HowItWorks.tsx','utf8')).toContain("['Photo Group List','/photo-group-list']");});
 it('includes photo cards in every plan without inventing a standalone price',()=>{expect(readFileSync('src/components/Pricing/PublicPricingSection.tsx','utf8')).toContain("emphasis: 'Create and Share Photo Call Out Cards'");expect(pricingComparisonRows.find(row=>row.product==='Photo Group List')?.cost).toEqual({display:'—'});expect(estimatedSeparateToolValueAud).toBe(2205);});
});
