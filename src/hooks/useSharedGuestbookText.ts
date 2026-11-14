import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { guestbookMemoryPoster } from '../../supabase/functions/_shared/guestbook-memory-poster';
import type { GalleryItem } from './useEventMediaGallery';
export function useSharedGuestbookText(eventId?: string | null) {
 const [items,setItems]=useState<GalleryItem[]>([]);
 useEffect(()=>{let active=true;setItems([]);if(!eventId)return;
 const load=async()=>{const {data,error}=await (supabase as any).from('event_guestbook_messages').select('id,uploader_name,message,created_at,moderation_status').eq('event_id',eventId).eq('moderation_status','approved');if(!active||error)return;setItems((data||[]).map((row:any)=>({id:row.id,kind:'photo',mime_type:'image/svg+xml',byte_size:0,duration_sec:null,storage_path:'',uploader_name:row.uploader_name,caption:row.message,guestbook_message:row.message,uploaded_at:row.created_at,moderation_status:'approved',album:null,is_guestbook:false,is_photo_booth:false,is_photo_booth_strip:false,source_category:'guestbook_text',signed_url:guestbookMemoryPoster(row.message,row.uploader_name)} as GalleryItem)));};
 void load();const timer=window.setInterval(load,20000);return()=>{active=false;window.clearInterval(timer)};},[eventId]);return items;
}
