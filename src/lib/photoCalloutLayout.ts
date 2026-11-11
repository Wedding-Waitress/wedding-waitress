import type { PhotoCard } from '@/types/photoCallout';
// Content-fit measurements may promote a regular card to two columns.
export function photoCardSpan(card:PhotoCard):1|2 {return card.people.length>20?2:1;}
export function paginatePhotoCards(cards:PhotoCard[],spans:Record<string,1|2>={}):PhotoCard[][] {
 const pages:PhotoCard[][]=[];let page:PhotoCard[]=[];let used=0;
 for(const card of cards){const span=spans[card.id]??photoCardSpan(card);const padding=used%3+span>3?3-used%3:0;
 if(used+padding+span>9){pages.push(page);page=[];used=0;}else used+=padding;
 page.push(card);used+=span;}
 if(page.length)pages.push(page);return pages;
}

export function photoCardTimingLine(card:PhotoCard):string {const tables=[...new Set(card.people.map(person=>person.table?.trim()).filter((table):table is string=>!!table))];const timing=[card.session,card.time].filter(Boolean).join(' · ');const tableText=tables.length?`${tables.length===1?'Table':'Tables'} ${tables.map(table=>table.replace(/^table\s+/i,'')).join(', ')}`:'';return [timing,tableText].filter(Boolean).join(' - ');}
