import {describe,it,expect} from 'vitest';
import {paginateTablesCards,type TablesDocumentCard} from './tablesDocument';
const card=(height=250):TablesDocumentCard=>({title:['Table'],capacity:8,occupied:8,people:[],continued:false,height});
describe('Tables document pagination',()=>{
  it('keeps six standard cards on one page and puts the seventh on the next',()=>{
    expect(paginateTablesCards(Array.from({length:7},()=>card())).map(page=>page.length)).toEqual([6,1]);
  });
  it('reduces rows for taller cards without dropping any cards',()=>{
    const cards=[card(400),card(),card(400),card(),card()];
    const pages=paginateTablesCards(cards);expect(pages.map(page=>page.length)).toEqual([4,1]);expect(pages.flat()).toEqual(cards);
  });
  it('retains a valid empty-event page',()=>expect(paginateTablesCards([])).toEqual([[]]));
});
