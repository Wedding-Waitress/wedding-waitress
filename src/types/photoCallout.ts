export interface PhotoPerson { id: string; name: string; table?: string }
export interface PhotoCard {
  id: string; title: string; category: string; partners: 'both' | 'one' | 'two' | 'neither';
  people: PhotoPerson[]; notes: string; pronunciation: string; session: string; time: string;
  mustHave: boolean; completed: boolean; minutes: number; everyone?: boolean;
}
export interface PhotoPlan { event_id: string; cards: PhotoCard[]; private_notes: Record<string,string>; revision: number; updated_at?: string }
export interface PhotoEvent { id: string; name: string; date?: string | null; venue?: string | null; ceremony_date?: string | null; ceremony_venue?: string | null; partner1_name?: string | null; partner2_name?: string | null; event_timezone?: string | null; ceremony_enabled?:boolean; reception_enabled?:boolean; start_time?:string|null;finish_time?:string|null;ceremony_start_time?:string|null;ceremony_finish_time?:string|null }
export interface PhotoShare { id: string; token: string; recipient_name: string | null; permission: 'view_only' | 'can_check'; expires_at: string; last_accessed_at: string | null }
export const createPhotoCard = (everyone = false): PhotoCard => ({ id: crypto.randomUUID(), title: everyone ? 'Group Photo' : '', category: everyone ? 'Everyone' : 'Family', partners: 'both', people: [], notes: '', pronunciation: '', session: 'After ceremony', time: '', mustHave: false, completed: false, minutes: everyone ? 5 : 3, ...(everyone ? {everyone:true} : {}) });
export const partnerLabel = (card: PhotoCard, event: PhotoEvent) => {
  const one = event.partner1_name?.trim() || 'Partner 1'; const two = event.partner2_name?.trim() || 'Partner 2';
  return card.partners === 'both' ? `${one} & ${two}` : card.partners === 'one' ? `${one} only` : card.partners === 'two' ? `${two} only` : 'Guests only';
};

export const normalizePhotoCard = (card: PhotoCard): PhotoCard => ({...card,session:card.session==='Before the ceremony'?'Before ceremony':card.session==='After the ceremony'?'After ceremony':card.session,...(card.everyone?{title:'Group Photo',partners:'both' as const}:{})});
