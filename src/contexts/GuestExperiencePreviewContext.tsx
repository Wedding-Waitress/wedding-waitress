import {createContext,useContext} from 'react';
import {supabase} from '@/integrations/supabase/client';
import type {GuestPreviewSnapshot,PreviewMode,createGuestPreviewClient} from '@/lib/organiserGuestPreview';
export type GuestExperiencePreview = {snapshot:GuestPreviewSnapshot;mode:PreviewMode;client:ReturnType<typeof createGuestPreviewClient>};
// Public guest routes never provide this context. Only the authenticated private loader supplies it.
export const GuestExperiencePreviewContext=createContext<GuestExperiencePreview|null>(null);
export const useGuestExperiencePreview=()=>useContext(GuestExperiencePreviewContext);
export const useGuestExperienceClient=()=> (useGuestExperiencePreview()?.client||supabase) as typeof supabase;
