import {createPhotoCard,type PhotoCard} from '@/types/photoCallout';
export function withGroupPhoto(cards:PhotoCard[],include:boolean):PhotoCard[]{const groups=cards.filter(card=>!card.everyone);if(!include)return groups;return [cards.find(card=>card.everyone)||createPhotoCard(true),...groups];}
export function firstMovablePhotoIndex(cards:PhotoCard[]):number{return cards[0]?.everyone?1:0;}
