import {getEnvironmentAwareShareBaseUrl} from './urlUtils';

export function buildPhotoCalloutUrl(token:string,eventName?:string,eventDate?:string|null):string {
 const eventSlug=(eventName?.trim()||'Wedding').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').normalize('NFC').toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'')||'wedding';
 const date=eventDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 const label=date?`${eventSlug}-${date[3]}-${date[2]}-${date[1]}`:eventSlug;
 return `${getEnvironmentAwareShareBaseUrl()}/shared-photo-callout-cards/${encodeURIComponent(label)}/${encodeURIComponent(token)}`;
}
