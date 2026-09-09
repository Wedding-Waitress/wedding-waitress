import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Smile, Frown } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { normalizeRsvp } from '@/lib/rsvp';
import { GuestRelationField } from './GuestRelationField';
import { GuestAdditionalFields, AdditionalGuestDraft } from './GuestAdditionalFields';
import { guestDietaryOptions } from './guestDietaryOptions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import styles from './GuestUpdateModal.module.css';

interface Guest {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  mobile?: string;
  email?: string;
  dietary?: string;
  notes?: string;
  rsvp: string;
  family_group?: string | null;
  mailing_address?: string | null;
  mailing_suburb?: string | null;
  mailing_state?: string | null;
  mailing_postcode?: string | null;
  address_received?: boolean | null;
}

interface Event {
  id: string;
  date?: string;
  event_timezone?: string;
  collect_guest_addresses?: boolean;
}

interface GuestUpdateModalProps {
  guest: Guest | null;
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  helperText?: string;
  allowNameEdit?: boolean;
  showMessageField?: boolean;
  isEditable?: boolean;
  allGuests?: any[];
  songRequestsEnabled?: boolean;
  songRequestsMax?: number;
  allowRsvp?: boolean;
}

interface SongRequestEntry {
  song_title: string;
  artist_name: string;
  music_link: string;
  note: string;
}

export const GuestUpdateModal: React.FC<GuestUpdateModalProps> = ({
  guest,
  event,
  open,
  onOpenChange,
  onUpdate,
  helperText,
  allowNameEdit = false,
  showMessageField = true,
  isEditable = true,
  allGuests = [],
  songRequestsEnabled = false,
  songRequestsMax = 0,
  allowRsvp = true,
}) => {
  const isMobile = useIsMobile();
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [contextError, setContextError] = useState('');
  const [additional, setAdditional] = useState<AdditionalGuestDraft[]>([]);
  const [relation, setRelation] = useState({relation_partner:'',relation_role:'',custom_relation:''});
  const [confirmRsvp,setConfirmRsvp]=useState(false);
  const [initialRsvp, setInitialRsvp] = useState('Pending');
  const [formData, setFormData] = useState({
    rsvp: 'Pending',
    first_name: '',
    last_name: '',
    mobile: '',
    email: '',
    dietary: 'NA',
    notes: '',
    mailing_address: '',
    mailing_suburb: '',
    mailing_state: '',
    mailing_postcode: ''
  });
  const { toast } = useToast();

  const buildEmptySongs = (n: number): SongRequestEntry[] =>
    Array.from({ length: Math.max(0, n) }, () => ({ song_title: '', artist_name: '', music_link: '', note: '' }));

  const [songRequests, setSongRequests] = useState<SongRequestEntry[]>(buildEmptySongs(songRequestsMax));

  useEffect(() => {
    setSongRequests((prev) => {
      const next = buildEmptySongs(songRequestsMax);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i];
      return next;
    });
  }, [songRequestsMax]);

  // Prefill existing song requests when modal opens
  useEffect(() => {
    const loadExistingRequests = async () => {
      if (!open || !guest?.id || !guest?.event_id || !songRequestsEnabled || songRequestsMax <= 0) return;
      const { data, error } = await (supabase as any).rpc('get_guest_song_requests_for_guest', {
        _event_id: guest.event_id || event?.id,
        _guest_id: guest.id,
      });
      if (error) return;
      const next = buildEmptySongs(songRequestsMax);
      (data || []).forEach((r: any) => {
        if (typeof r.slot_index === 'number' && r.slot_index >= 0 && r.slot_index < next.length) {
          next[r.slot_index] = {
            song_title: r.song_title || '',
            artist_name: r.artist_name || '',
            music_link: r.music_link || '',
            note: r.note || '',
          };
        }
      });
      setSongRequests(next);
    };
    loadExistingRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guest?.id, songRequestsEnabled, songRequestsMax]);


  useEffect(() => {
    let cancelled=false;
    if (!open || !guest) return;
    setContext(null); setContextError(''); setAdditional([]); setConfirmRsvp(false);
    (supabase as any).rpc('get_guest_details_form',{_event_id:guest.event_id||event?.id,_guest_id:guest.id}).then(({data,error}:any)=>{
      if(cancelled)return;
      if(error||!data){setContextError('Unable to load your details. Close this form and try again.');return;}
      setContext(data);
      const g=data.guest;
      setInitialRsvp(g.rsvp||'Pending');
      setFormData(prev=>Object.fromEntries(Object.keys(prev).map(k=>[k,g[k]??(k==='dietary'?'NA':'')])) as typeof prev);
      setRelation({relation_partner:g.relation_partner||'',relation_role:g.relation_role||'',custom_relation:''});
    });
    return ()=>{cancelled=true;};
  },[open,guest?.id,event?.id]);

  const handleSave = async (confirmed = false) => {
    if (!guest || !context?.can_edit) return;
    if (context.allow_name_edit && (!formData.first_name.trim() || !formData.last_name.trim())) {
      toast({title:'First and last name are required',variant:'destructive'});return;
    }
    if (additional.some(g=>!g.first_name.trim()||!g.last_name.trim()||!g.group_choice)) {
      toast({title:'Complete each additional guest’s name and group choice',variant:'destructive'});return;
    }
    if (!confirmed && normalizeRsvp(initialRsvp)!=='Pending' && normalizeRsvp(formData.rsvp)!==normalizeRsvp(initialRsvp)) {setConfirmRsvp(true);return;}
    setConfirmRsvp(false);
    setSaving(true);
    try {
      const {data,error}=await (supabase as any).rpc('save_guest_details_form',{
        _event_id:guest.event_id||event?.id,_guest_id:guest.id,
        _details:{...formData,...relation},_additional:additional,
      });
      if(error)throw error;
      if(!data)throw new Error('Unable to save guest details');

      // Submit song requests if feature enabled
      if (songRequestsEnabled && songRequestsMax > 0 && guest) {
        const payload = songRequests.map((r, idx) => ({
          slot_index: idx,
          song_title: r.song_title?.trim() || '',
          artist_name: r.artist_name?.trim() || '',
          music_link: r.music_link?.trim() || '',
          note: r.note?.trim() || '',
        }));
        const { error: songErr } = await (supabase as any).rpc('submit_guest_song_requests', {
          _event_id: guest.event_id || event?.id,
          _guest_id: guest.id,
          _requests: payload,
        });
        if (songErr) console.error('❌ [Song Requests] RPC error:', songErr);
      }


      toast({
        title: 'Saved and sent to organiser',
        description: 'Your information has been updated successfully.'
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ [Guest Update] Fatal error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : (error as any)?.message || 'Failed to update information. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDecline = async () => {
    if (!guest || !context?.can_edit || !context?.can_rsvp) return;
    setSaving(true);
    try {
      const declineDetails: Record<string, string> = { rsvp: 'Not Attending' };
      if (context.allow_name_edit) {
        declineDetails.first_name = context.guest.first_name || '';
        declineDetails.last_name = context.guest.last_name || '';
      }
      const { data, error } = await (supabase as any).rpc('save_guest_details_form', {
        _event_id: guest.event_id || event?.id,
        _guest_id: guest.id,
        _details: declineDetails,
        _additional: [],
      });
      if (error) throw error;
      if (!data) throw new Error('Unable to confirm your RSVP decline');
      toast({
        title: 'RSVP decline confirmed',
        description: 'Your response has been sent to the event organiser.',
      });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ [Guest RSVP Decline] Fatal error:', error);
      toast({
        title: 'Unable to confirm decline',
        description: error instanceof Error ? error.message : (error as any)?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!guest) return null;

  const headerTitle = 'Update Your Information';
  const headerSubtitle = (
    <div data-live-body className="text-sm text-foreground space-y-1">
      <span className="block">{helperText || "Please update, edit your details & save below."}</span>
      <span className="block">Your response will be sent to the event organiser when you save your details or confirm your decline.</span>
    </div>
  );

  const groupedGuestCount = context?.guest?.family_group
    ? allGuests.filter((candidate) => (
        candidate.id !== guest.id
        && candidate.family_group === context.guest.family_group
      )).length
    : 0;
  const categoryCount = 1
    + groupedGuestCount
    + additional.filter((candidate) => candidate.group_choice === 'group').length;
  const selectedCategoryIndex = categoryCount > 2 ? 2 : categoryCount === 2 ? 1 : 0;
  const categoryOptions = [
    { label: 'Individual', value: 'individual' as const, className: styles.categoryIndividual },
    { label: 'Couple', value: 'couple' as const, className: styles.categoryCouple },
    { label: 'Family', value: 'family' as const, className: styles.categoryFamily },
  ];
  const activeCategory = categoryOptions[selectedCategoryIndex];
  const currentRsvp = normalizeRsvp(formData.rsvp);
  const canChangeRsvp = Boolean(allowRsvp && context?.can_rsvp);
  const detailsUnlocked = !allowRsvp || !context?.can_rsvp || currentRsvp === 'Attending';

  const formBody = contextError ? <p role="alert">{contextError}</p> : !context ? <p>Loading your details…</p> : (!isEditable || !context.can_edit) ? (
    <div className="text-center space-y-2">
      <p className="text-sm font-medium text-destructive">
        RSVP date has passed. Please contact the organiser to make changes.
      </p>
    </div>
  ) : (
    <div className="space-y-4">
      {allowRsvp && (
        <section className="space-y-3">
          <div className={styles.rsvpStatusPanel}>
            <Label className={styles.rsvpStatusLabel}>RSVP Status: {formData.rsvp}</Label>
            {context.can_rsvp && <div className={styles.rsvpActionRow}>
            <Button
              type="button"
              aria-pressed={normalizeRsvp(formData.rsvp) === 'Attending'}
              className={`w-full bg-green-500 text-white ${styles.actionButton} ${styles.saveButton}`}
              onClick={() => setFormData({ ...formData, rsvp: 'Attending' })}
            >
              <Smile aria-hidden="true" className="mr-2 shrink-0 text-white" />
              Accept
            </Button>
            <Button
              type="button"
              variant="destructive"
              aria-pressed={normalizeRsvp(formData.rsvp) === 'Not Attending'}
              className={`w-full bg-red-500 text-white ${styles.actionButton} ${styles.cancelButton}`}
              onClick={() => setFormData({ ...formData, rsvp: 'Not Attending' })}
            >
              <Frown aria-hidden="true" className="mr-2 shrink-0 text-white" />
              Decline
            </Button>
            </div>}
          </div>
          {!context.can_rsvp && <p className="text-sm">RSVP changes are currently closed by the organiser. You can still review and update the available details below.</p>}
        </section>
      )}
      {canChangeRsvp && currentRsvp === 'Pending' && <p className="text-center text-sm font-medium">Please choose Accept or Decline to continue.</p>}
      {canChangeRsvp && currentRsvp === 'Not Attending' && (
        <section className="space-y-3 rounded-xl border border-red-500/60 p-4">
          {normalizeRsvp(initialRsvp) === 'Not Attending' ? (
            <p className="text-sm">Your decline is confirmed. Choose Accept if you need to change your response.</p>
          ) : (
            <>
              <p className="text-sm">Confirming will update only your RSVP. It will not change other guests, your group, or seating.</p>
              <Button type="button" variant="destructive" disabled={saving} onClick={handleConfirmDecline} className={`w-full bg-red-500 text-white ${styles.actionButton} ${styles.cancelButton}`}>
                {saving ? <Loader2 className="mr-2 animate-spin text-white" /> : <Frown aria-hidden="true" className="mr-2 shrink-0 text-white" />}
                Confirm decline
              </Button>
            </>
          )}
        </section>
      )}
      {detailsUnlocked && <>
      <div className="space-y-4 rounded-xl border border-primary/40 bg-background p-3">
      {context.allow_name_edit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input id="first_name" type="text" required maxLength={100} value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              disabled={!isEditable}
              className="border-primary w-full" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input id="last_name" type="text" required maxLength={100} value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              disabled={!isEditable}
              className="border-primary w-full" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter your email address" disabled={!isEditable}
          className="border-primary w-full" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mobile">Mobile Number</Label>
        <Input id="mobile" type="tel" value={formData.mobile}
          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
          placeholder="0411569505" disabled={!isEditable}
          className="border-primary w-full" />
      </div>
      </div>
      <GuestRelationField context={context} value={relation} onChange={setRelation}/>
      <div className="space-y-2">
        <Label htmlFor="dietary">Dietary Requirements</Label>
        <Select value={formData.dietary}
          onValueChange={(value) => setFormData({ ...formData, dietary: value })}
          disabled={!isEditable}>
          <SelectTrigger id="dietary" className="border-primary w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="ww-public-live-menu">
            {guestDietaryOptions.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {event?.collect_guest_addresses && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mailing_address">Mailing Address</Label>
              <Input id="mailing_address" type="text" value={formData.mailing_address}
                onChange={(e) => setFormData({ ...formData, mailing_address: e.target.value })}
                placeholder="14 Somerville Road" disabled={!isEditable}
                maxLength={200}
                className="border-primary w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mailing_suburb">Suburb</Label>
              <Input id="mailing_suburb" type="text" value={formData.mailing_suburb}
                onChange={(e) => setFormData({ ...formData, mailing_suburb: e.target.value })}
                placeholder="Sunshine West" disabled={!isEditable}
                maxLength={100}
                className="border-primary w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mailing_state">State</Label>
              <Input id="mailing_state" type="text" value={formData.mailing_state}
                onChange={(e) => setFormData({ ...formData, mailing_state: e.target.value })}
                placeholder="VIC" disabled={!isEditable}
                maxLength={100}
                className="border-primary w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mailing_postcode">Postcode</Label>
              <Input id="mailing_postcode" type="text" inputMode="numeric" value={formData.mailing_postcode}
                onChange={(e) => setFormData({ ...formData, mailing_postcode: e.target.value })}
                placeholder="3020" disabled={!isEditable}
                maxLength={20}
                className="border-primary w-full" />
            </div>
          </div>
        </div>
      )}
      </div>
      <GuestAdditionalFields
        members={[guest,...allGuests.filter(g=>g.id!==guest.id&&g.family_group&&g.family_group===context.guest.family_group)]}
        drafts={additional}
        onChange={setAdditional}
        canAdd={context.can_add}
        category={activeCategory.value}
        className={styles.groupSection}
        headingClassName={styles.groupSectionHeading}
        categorySelector={<div className="space-y-2">
          <Label>Guest Category</Label>
          <div className={`flex rounded-full border border-primary p-1 ${styles.categorySelector}`}>
            {categoryOptions.map((option, index) => (
              <span key={option.label} data-selected={index === selectedCategoryIndex} className={`flex-1 rounded-full py-2 text-center ${styles.categoryOption} ${option.className}`}>{option.label}</span>
            ))}
          </div>
        </div>}
      />
      {songRequestsEnabled && songRequestsMax > 0 && isEditable && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Song Requests</Label>
            <p className="text-xs text-muted-foreground">
              Request up to {songRequestsMax} song{songRequestsMax === 1 ? '' : 's'} for the DJ. Leave blank to skip.
            </p>
          </div>
          {songRequests.map((entry, idx) => (
            <div key={idx} className="space-y-3 rounded-xl border border-primary/40 bg-background p-3">
              <p className="text-xs font-semibold text-primary">Song {idx + 1}</p>
              <div className="space-y-2">
                <Label htmlFor={`song-title-${idx}`}>Song Title</Label>
                <Input id={`song-title-${idx}`} value={entry.song_title}
                  onChange={(e) => setSongRequests((arr) => arr.map((r, i) => i === idx ? { ...r, song_title: e.target.value } : r))}
                  placeholder="e.g. Sweet Caroline" maxLength={150}
                  className="border-primary w-full" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`song-artist-${idx}`}>Artist Name</Label>
                <Input id={`song-artist-${idx}`} value={entry.artist_name}
                  onChange={(e) => setSongRequests((arr) => arr.map((r, i) => i === idx ? { ...r, artist_name: e.target.value } : r))}
                  placeholder="e.g. Neil Diamond" maxLength={150}
                  className="border-primary w-full" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`song-link-${idx}`}>Music Link (optional)</Label>
                <Input id={`song-link-${idx}`} type="url" value={entry.music_link}
                  onChange={(e) => setSongRequests((arr) => arr.map((r, i) => i === idx ? { ...r, music_link: e.target.value } : r))}
                  placeholder="Spotify, YouTube or Apple Music link" maxLength={500}
                  className="border-primary w-full" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`song-note-${idx}`}>Note (optional)</Label>
                <Textarea id={`song-note-${idx}`} value={entry.note}
                  onChange={(e) => setSongRequests((arr) => arr.map((r, i) => i === idx ? { ...r, note: e.target.value } : r))}
                  placeholder="Anything the DJ should know"
                  rows={2} maxLength={500} className="border-primary w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
      {showMessageField && (
        <div className="space-y-2">
          <Label htmlFor="notes">Special Requests or Notes</Label>
          <Textarea id="notes" value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any special requests, allergies, or additional information..."
            rows={3} disabled={!isEditable} className="border-primary w-full" />
        </div>
      )}
      </>}

      <AlertDialog open={confirmRsvp} onOpenChange={setConfirmRsvp}><AlertDialogContent className="ww-public-live-dialog z-[11000]"><AlertDialogHeader><AlertDialogTitle>RSVP Already Submitted</AlertDialogTitle><AlertDialogDescription>You have already responded to this invitation. Changing your RSVP may affect seating arrangements, catering, and event planning. Are you sure you want to send this update to the organiser?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={()=>handleSave(true)} disabled={saving}>Yes, Update RSVP</AlertDialogAction><AlertDialogCancel onClick={()=>setFormData({...formData,rsvp:initialRsvp})}>Keep Current RSVP</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>

    </div>
  );

  const footerButtons = (
    <>
      {isEditable && (
        <Button onClick={()=>handleSave()} disabled={saving || !context?.can_edit || (canChangeRsvp && currentRsvp !== 'Attending')}
          className={`flex-1 bg-green-500 text-white ${styles.actionButton} ${styles.saveButton}`}>
          {saving ? <Loader2 className="mr-2 animate-spin text-white" /> : <Smile aria-hidden="true" className="mr-2 shrink-0 text-white" />}
          Save Changes
        </Button>
      )}
      <Button variant="destructive" onClick={() => onOpenChange(false)} disabled={saving}
        className={`${isEditable ? 'flex-1' : 'w-full'} bg-red-500 text-white ${styles.actionButton} ${styles.cancelButton}`}>
        <Frown aria-hidden="true" className="mr-2 shrink-0 text-white" />
        Cancel
      </Button>
    </>
  );

  // MOBILE: render as a true body-portal bottom sheet, independent of any
  // page/card transforms, overflow clipping, or dialog primitives.
  if (isMobile && open && typeof document !== 'undefined') {
    return createPortal(
      <div className="ww-public-live-dialog fixed inset-0 z-[9999] overflow-hidden" role="dialog" aria-modal="true">
        <div
          className="fixed inset-0 bg-black/60"
          onClick={() => onOpenChange(false)}
        />
        <div
          className="fixed inset-x-0 top-0 bottom-0 z-[10000] flex w-full min-w-0 flex-col overflow-hidden bg-background shadow-2xl"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
        >
          <div className="relative shrink-0 px-4 pt-5 pb-3 border-b bg-background">
            <h2 className="text-center text-lg font-semibold text-primary pr-10">
              {headerTitle}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="absolute right-3 top-3 inline-flex items-center justify-center h-9 w-9 rounded-full border-2 border-primary bg-white"
            >
              <X className="h-4 w-4 text-primary" />
            </button>
            <div className="mt-2 px-1">{headerSubtitle}</div>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-5 pb-8"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {formBody}
          </div>
          <div
            className="z-50 flex shrink-0 flex-row gap-3 bg-background border-t px-4 py-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          >
            {footerButtons}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // DESKTOP / TABLET (>=1024px): unchanged dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ww-public-live-dialog sm:max-w-[720px] sm:max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-primary">{headerTitle}</DialogTitle>
          <DialogDescription asChild>{headerSubtitle}</DialogDescription>
        </DialogHeader>
        <div className="px-6 py-4 overflow-y-auto flex-1">{formBody}</div>
        <div className="flex shrink-0 flex-row gap-3 bg-background px-6 py-4 border-t sm:justify-center">
          {footerButtons}
        </div>
      </DialogContent>
    </Dialog>
  );
};
