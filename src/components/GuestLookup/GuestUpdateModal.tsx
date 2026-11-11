import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
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
import { GuestDietarySelect } from './GuestDietarySelect';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { usePublicRsvpImmediateSaveCopy } from '@/i18n/usePublicRsvpImmediateSaveCopy';
import { usePublicGuestDetailsCopy } from '@/i18n/usePublicGuestDetailsCopy';
import { usePublicFamilyDetailsCopy } from '@/i18n/usePublicFamilyDetailsCopy';
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
  enableGroupRsvp?: boolean;
  editOnUpdate?: boolean;
  inline?: boolean;
  dismissRequest?: number;
  onDismissCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Present only for a recipient-specific invitation URL. */
  accessToken?: string;
}

interface SongRequestEntry {
  song_title: string;
  artist_name: string;
  music_link: string;
  note: string;
}

type ImmediateRsvpSaveState = 'idle' | 'saving' | 'saved' | 'error';
const EMPTY_GUESTS: any[] = [];

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
  allGuests = EMPTY_GUESTS,
  songRequestsEnabled = false,
  songRequestsMax = 0,
  allowRsvp = true,
  enableGroupRsvp = false,
  editOnUpdate = false,
  inline = false,
  dismissRequest = 0,
  onDismissCancel,
  onDirtyChange,
  accessToken,
}) => {
  const isMobile = useIsMobile();
  const immediateSaveCopy = usePublicRsvpImmediateSaveCopy();
  const familyCopy = usePublicFamilyDetailsCopy();
  const [editorVisible, setEditorVisible] = useState(!editOnUpdate);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const selectedId = selectedMemberId || guest?.id;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [invitationContext, setInvitationContext] = useState<any>(null);
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const [groupEditorId, setGroupEditorId] = useState<string | null>(null);
  const groupEditorRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRequested = useRef(false);
  useEffect(() => {
    setSelectedMemberId(null); setInvitationContext(null); setPendingSwitch(null); setGroupEditorId(null); setEditorVisible(!editOnUpdate);
  }, [open, guest?.id]);
  const detailsCopy = usePublicGuestDetailsCopy();
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [contextError, setContextError] = useState('');
  const [additional, setAdditional] = useState<AdditionalGuestDraft[]>([]);
  const [relation, setRelation] = useState({relation_partner:'',relation_role:'',custom_relation:''});
  const [confirmRsvp,setConfirmRsvp]=useState(false);
  const [initialRsvp, setInitialRsvp] = useState('Pending');
  const [partyRsvps, setPartyRsvps] = useState<Record<string, string>>({});
  const [partySaveStates, setPartySaveStates] = useState<Record<string, ImmediateRsvpSaveState>>({});
  const partySaveInFlight = useRef<Set<string>>(new Set());
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

  const initialSongs = useRef<SongRequestEntry[]>(buildEmptySongs(songRequestsMax));

  useEffect(() => {
    setSongRequests((prev) => {
      const next = buildEmptySongs(songRequestsMax);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i];
      return next;
    });
  }, [songRequestsMax]);

  // Prefill existing song requests when modal opens
  useEffect(() => {
    let cancelled = false;
    const loadExistingRequests = async () => {
      if (!open || !guest?.id || !guest?.event_id || !songRequestsEnabled || songRequestsMax <= 0) return;
      initialSongs.current = buildEmptySongs(songRequestsMax);
      setSongRequests(initialSongs.current);
      const { data, error } = await (supabase as any).rpc('get_guest_song_requests_for_guest', {
        _event_id: guest.event_id || event?.id,
        _guest_id: selectedId,
      });
      if (error || cancelled) return;
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
      initialSongs.current = next;
      setSongRequests(next);
    };
    loadExistingRequests();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guest?.id, selectedId, songRequestsEnabled, songRequestsMax]);


  useEffect(() => {
    let cancelled=false;
    if (!open || !guest) return;
    setContext(null); setContextError(''); setAdditional([]); setConfirmRsvp(false); setConfirmClose(false);
    (supabase as any).rpc(accessToken ? (inline ? 'qr_guest_details' : 'get_guest_details_form_authorized') : 'get_guest_details_form',{
      _event_id:guest.event_id||event?.id,_guest_id:selectedId,
      ...(accessToken ? { _access_token: accessToken } : {}),
    }).then(({data,error}:any)=>{
      if(cancelled)return;
      if(error||!data){setContextError('Unable to load your details. Close this form and try again.');return;}
      setContext(data);
      if (selectedId === guest.id) setInvitationContext(data);
      const g=data.guest;
      setInitialRsvp(g.rsvp||'Pending');
      setFormData(prev=>Object.fromEntries(Object.keys(prev).map(k=>[k,g[k]??(k==='dietary'?'NA':'')])) as typeof prev);
      setRelation({relation_partner:g.relation_partner||'',relation_role:g.relation_role||'',custom_relation:''});
    });
    return ()=>{cancelled=true;};
  },[open,guest?.id,selectedId,event?.id,accessToken]);

  const invitedParty = React.useMemo(() => {
    if (!guest) return [];
    if (!guest.family_group) return [guest];
    const members = allGuests.filter((candidate) => candidate.family_group === guest.family_group);
    return members.length > 0 ? members : [guest];
  }, [allGuests, guest]);
  const hasInvitedParty = enableGroupRsvp && invitedParty.length > 1;
  const immediateRsvp = Boolean(accessToken || (context?.is_manager && hasInvitedParty));

  useEffect(() => {
    if (!open || !guest) return;
    setPartyRsvps(Object.fromEntries(invitedParty.map((member) => [member.id, normalizeRsvp(member.rsvp)])));
  }, [open, guest?.id, invitedParty]);

  useEffect(() => {
    if (!open || !guest) return;
    setPartySaveStates({});
    partySaveInFlight.current.clear();
  }, [open, guest?.id, accessToken]);

  const scrollToDetails = () => {
    const target = groupEditorId === selectedId ? groupEditorRef.current : detailsRef.current;
    if (!target || !scrollRef.current) return;
    const pane = scrollRef.current;
    if (inline) { target.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    pane.scrollTo({ top: pane.scrollTop + target.getBoundingClientRect().top - pane.getBoundingClientRect().top - 12, behavior: 'smooth' });
  };
  useEffect(() => {
    if (context && scrollRequested.current) { scrollRequested.current = false; scrollToDetails(); }
  }, [context, groupEditorId, editorVisible]);
  const switchMember = (id: string) => {
    setPendingSwitch(null); setEditorVisible(true); scrollRequested.current = true;
    if (id === selectedId) { scrollToDetails(); return; }
    setContext(null); setAdditional([]); setSelectedMemberId(id); scrollRequested.current = true;
  };

  const handleRecipientRsvp = async (member: Guest, nextRsvp: 'Attending' | 'Not Attending') => {
    const previousRsvp = normalizeRsvp(partyRsvps[member.id] ?? member.rsvp);

    if (!immediateRsvp) {
      setPartyRsvps((previous) => ({ ...previous, [member.id]: nextRsvp }));
      if (member.id === selectedIdRef.current) setFormData((previous) => ({ ...previous, rsvp: nextRsvp }));
      return;
    }

    if (!context?.can_rsvp || partySaveInFlight.current.has(member.id) || previousRsvp === nextRsvp) return;

    partySaveInFlight.current.add(member.id);
    setPartyRsvps((previous) => ({ ...previous, [member.id]: nextRsvp }));
    setPartySaveStates((previous) => ({ ...previous, [member.id]: 'saving' }));
    if (member.id === selectedIdRef.current) setFormData((previous) => ({ ...previous, rsvp: nextRsvp }));

    try {
      const { data, error } = await (supabase as any).rpc(accessToken ? (inline ? 'qr_guest_save_rsvps' : 'save_guest_invitation_rsvps') : 'save_guest_details_form', accessToken ? {
        _access_token: accessToken,
        _responses: [{ guest_id: member.id, rsvp: nextRsvp }],
      } : { _event_id: guest?.event_id || event?.id, _guest_id: member.id, _details: { rsvp: nextRsvp }, _additional: [] });
      if (error || !data) throw error || new Error('Unable to save this RSVP');

      if (member.id === selectedIdRef.current) setInitialRsvp(nextRsvp);
      setPartySaveStates((previous) => ({ ...previous, [member.id]: 'saved' }));
      onUpdate();
    } catch (error) {
      setPartyRsvps((previous) => ({ ...previous, [member.id]: previousRsvp }));
      if (member.id === selectedIdRef.current) setFormData((previous) => ({ ...previous, rsvp: previousRsvp }));
      setPartySaveStates((previous) => ({ ...previous, [member.id]: 'error' }));
      toast({
        title: immediateSaveCopy.unableTitle,
        description: error instanceof Error ? error.message : immediateSaveCopy.retry,
        variant: 'destructive',
      });
    } finally {
      partySaveInFlight.current.delete(member.id);
    }
  };

  const handleSave = async (confirmed = false, switchTo?: string) => {
    if (!guest || !context?.can_edit) return;
    if ((!editOnUpdate || editorVisible) && context.allow_name_edit && (!formData.first_name.trim() || !formData.last_name.trim())) {
      toast({title:'First and last name are required',variant:'destructive'});return;
    }
    if (additional.some(g=>!g.first_name.trim()||!g.last_name.trim()||!g.group_choice)) {
      toast({title:'Complete each additional guest’s name and group choice',variant:'destructive'});return;
    }
    if (!immediateRsvp && !confirmed && normalizeRsvp(initialRsvp)!=='Pending' && normalizeRsvp(formData.rsvp)!==normalizeRsvp(initialRsvp)) {setConfirmRsvp(true);return;}
    setConfirmRsvp(false);
    setSaving(true);
    try {
      const { rsvp, ...personalDetails } = formData;
      const detailsHidden = editOnUpdate && !editorVisible;
      const chosenRsvp = normalizeRsvp(partyRsvps[selectedId] ?? context.guest.rsvp);
      const rsvpChanged = !immediateRsvp && chosenRsvp !== normalizeRsvp(context.guest.rsvp);
      // Before Update, save only explicit RSVP/additional-guest changes. Never
      // submit hidden personal defaults or overwrite existing contact fields.
      if (!detailsHidden || additional.length > 0 || rsvpChanged) {
        const details = detailsHidden
          ? (rsvpChanged ? { rsvp: chosenRsvp } : {})
          : { ...(immediateRsvp ? personalDetails : formData), ...relation };
        const {data,error}=await (supabase as any).rpc(accessToken ? (inline ? 'qr_guest_save_details' : 'save_guest_details_form_authorized') : 'save_guest_details_form',{
          _event_id:guest.event_id||event?.id,_guest_id:selectedId,
          _details:{...details,...(!accessToken && selectedId !== guest.id ? { _invitation_guest_id: guest.id } : {})},_additional:additional,
          ...(accessToken ? { _access_token: accessToken } : {}),
        });
        if(error)throw error;
        if(!data)throw new Error('Unable to save guest details');
      }

      // Save only party members whose selected RSVP changed. Existing invited
      // relatives/partners are never treated as newly added guests.
      if (hasInvitedParty && !immediateRsvp) {
        for (const member of invitedParty) {
          if (member.id === selectedId) continue;
          const nextRsvp = normalizeRsvp(partyRsvps[member.id] ?? member.rsvp);
          if (nextRsvp === normalizeRsvp(member.rsvp)) continue;
          const { data: memberSaved, error: memberError } = await (supabase as any).rpc('save_guest_details_form', {
            _event_id: guest.event_id || event?.id,
            _guest_id: member.id,
            _details: { rsvp: nextRsvp },
            _additional: [],
          });
          if (memberError || !memberSaved) throw memberError || new Error('Unable to save a party member RSVP');
        }
      }

      // Submit song requests if feature enabled
      if ((!editOnUpdate || editorVisible) && songRequestsEnabled && songRequestsMax > 0 && guest) {
        const payload = songRequests.map((r, idx) => ({
          slot_index: idx,
          song_title: r.song_title?.trim() || '',
          artist_name: r.artist_name?.trim() || '',
          music_link: r.music_link?.trim() || '',
          note: r.note?.trim() || '',
        }));
        const { error: songErr } = await (supabase as any).rpc('submit_guest_song_requests', {
          _event_id: guest.event_id || event?.id,
          _guest_id: selectedId,
          _requests: payload,
        });
        if (songErr) console.error('❌ [Song Requests] RPC error:', songErr);
      }


      toast({
        title: 'Saved and sent to organiser',
        description: 'Your information has been updated successfully.'
      });

      onUpdate();
      if (switchTo) switchMember(switchTo);
      else onOpenChange(false);
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
    if (accessToken) {
      setSaving(true);
      try {
        const { data, error } = await (supabase as any).rpc(inline ? 'qr_guest_save_rsvps' : 'save_guest_invitation_rsvps', {
          _access_token: accessToken,
          _responses: [{ guest_id: guest.id, rsvp: 'Not Attending' }],
        });
        if (error || !data) throw error || new Error('Unable to confirm your RSVP decline');
        toast({ title: 'RSVP decline confirmed', description: 'Your response has been sent to the event organiser.' });
        onUpdate();
        onOpenChange(false);
      } catch (error) {
        toast({ title: 'Unable to confirm decline', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
      } finally { setSaving(false); }
      return;
    }
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

  const hasUnsavedEdits = Boolean(context?.can_edit && (
    Object.entries(formData).some(([key, value]) =>
      !(immediateRsvp && key === 'rsvp') && value !== (context.guest[key] ?? (key === 'dietary' ? 'NA' : ''))
    ) || relation.relation_partner !== (context.guest.relation_partner || '')
      || relation.relation_role !== (context.guest.relation_role || '') || relation.custom_relation !== ''
      || additional.length > 0
      || (songRequestsEnabled && JSON.stringify(songRequests) !== JSON.stringify(initialSongs.current))
      || (!immediateRsvp && hasInvitedParty && invitedParty.some(member =>
        normalizeRsvp(partyRsvps[member.id] ?? member.rsvp) !== normalizeRsvp(member.rsvp)))
  ));
  const requestClose = () => {
    if (saving) return;
    if (hasUnsavedEdits) setConfirmClose(true);
    else onOpenChange(false);
  };

  const requestMember = (id: string) => {
    if (saving || !context) return;
    if (id !== selectedId && hasUnsavedEdits) setPendingSwitch(id);
    else switchMember(id);
  };

  const handledDismiss = useRef(0);
  useEffect(() => { onDirtyChange?.(Boolean(open && hasUnsavedEdits)); }, [open, hasUnsavedEdits, onDirtyChange]);
  useEffect(() => {
    if (open && dismissRequest && dismissRequest !== handledDismiss.current) { handledDismiss.current = dismissRequest; requestClose(); }
  }, [open, dismissRequest, saving, hasUnsavedEdits, onOpenChange]);

  if (!guest) return null;

  const headerTitle = 'Update Your Information';
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
  const detailsUnlocked = Boolean(context?.can_edit) && (Boolean(accessToken) || context?.is_manager || hasInvitedParty || !allowRsvp || !context?.can_rsvp || currentRsvp === 'Attending');

  const partyRsvpCards = context && (editOnUpdate || (allowRsvp && hasInvitedParty)) ? <div data-guest-party-rsvps className="space-y-3">
          {(enableGroupRsvp ? invitedParty : [guest]).map((member) => {
            const status = normalizeRsvp(partyRsvps[member.id] ?? member.rsvp);
            const saveState = partySaveStates[member.id] || 'idle';
            const isSavingMember = saveState === 'saving';
            return (
              <div key={member.id} className={`rounded-xl border border-primary/40 bg-background p-3 ${styles.partyMemberCard}`}>
                <div className={styles.partyMemberHeading}>
                  <span
                    aria-live="polite"
                    className={styles.rsvpStatusBadge}
                    data-rsvp-status={status === 'Attending' ? 'attending' : status === 'Not Attending' ? 'declined' : 'pending'}
                  >
                    {status === 'Attending' ? familyCopy.yes : status === 'Not Attending' ? familyCopy.no : status}
                  </span>
                  <Label className={styles.partyMemberName}>{member.first_name} {member.last_name}</Label>
                </div>
                <div className={styles.memberActionRow}>

                  {allowRsvp && <><Button type="button" aria-pressed={status === 'Attending'} disabled={!context.can_rsvp || isSavingMember}
                    className={`w-full bg-green-500 text-white ${styles.actionButton} ${styles.saveButton}`}
                    onClick={() => handleRecipientRsvp(member, 'Attending')}>
                    <Smile aria-hidden="true" className="shrink-0 text-white" />Accept
                  </Button>
                  <Button type="button" variant="destructive" aria-pressed={status === 'Not Attending'} disabled={!context.can_rsvp || isSavingMember}
                    className={`w-full bg-red-500 text-white ${styles.actionButton} ${styles.cancelButton}`}
                    onClick={() => handleRecipientRsvp(member, 'Not Attending')}>
                    <Frown aria-hidden="true" className="shrink-0 text-white" />Decline
                  </Button></>}
                  <Button type="button" data-family-member-update disabled={saving || !context.can_edit} aria-pressed={selectedId === member.id}
                    className={`w-full bg-orange-500 text-white ${styles.actionButton} ${styles.updateButton}`}
                    onClick={() => { setGroupEditorId(null); scrollRequested.current = true; requestMember(member.id); }}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white"><path d="m16 3 5 5-12 12-6 1 1-6Z" /><path d="m14 5 5 5" /></svg>{familyCopy.update}
                  </Button>
                </div>
                {accessToken && saveState !== 'idle' && (
                  <p
                    aria-live="polite"
                    role={saveState === 'error' ? 'alert' : 'status'}
                    className={styles.immediateSaveStatus}
                    data-save-state={saveState}
                  >
                    {saveState === 'saving' ? immediateSaveCopy.saving : saveState === 'saved' ? immediateSaveCopy.saved : immediateSaveCopy.retry}
                  </p>
                )}
              </div>
            );
          })}
  </div> : undefined;

  const formBody = contextError ? <p role="alert">{contextError}</p> : !context ? <p>Loading your details…</p> : (!isEditable || !context.can_edit) ? (
    <div className="text-center space-y-2">
      <p className="text-sm font-medium text-destructive">
        RSVP date has passed. Please contact the organiser to make changes.
      </p>
    </div>
  ) : (
    <div className="space-y-4">
      {allowRsvp && (editOnUpdate || hasInvitedParty) && <div data-guest-rsvp-intro className="space-y-1 text-center">
        <h2 className={styles.dialogHeading}>RSVP for your family / party</h2>
        <p className="text-sm text-muted-foreground">{immediateSaveCopy.choosePerson}</p>
      </div>}
      {(detailsUnlocked || (editOnUpdate && context.can_edit)) && (
      <GuestAdditionalFields
        memberContent={partyRsvpCards}
        members={invitedParty}
        onUpdateMember={(id) => { setGroupEditorId(id); scrollRequested.current = true; requestMember(id); }}
        updateLabel={familyCopy.update}
        updateDisabled={saving || !isEditable || !context.can_edit}
        renderMemberEditor={(member) => groupEditorId === member.id && selectedId === member.id && context.guest.id === member.id ? (
          <div ref={groupEditorRef} data-group-member-editor={member.id} className="mt-3 space-y-3 rounded-xl border border-primary/40 p-3">
      <GuestRelationField context={context} value={relation} onChange={setRelation}/>
      <div className="space-y-2">
        <Label htmlFor="dietary">Dietary Requirements</Label>
        <GuestDietarySelect id="dietary" value={formData.dietary} onChange={dietary=>setFormData({...formData,dietary})} disabled={!isEditable}/>
      </div>

          </div>
        ) : null}
        drafts={additional}
        onChange={setAdditional}
        canAdd={(invitationContext || context).can_add}
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
      )}
      {!editOnUpdate && !hasInvitedParty && allowRsvp && (
        <section className="space-y-3">
          <div className={styles.rsvpStatusPanel}>
            <Label className={styles.rsvpStatusLabel}>RSVP Status: {formData.rsvp}</Label>
            {context.can_rsvp && <div className={styles.rsvpActionRow}>
            <Button
              type="button"
              aria-pressed={normalizeRsvp(formData.rsvp) === 'Attending'}
              disabled={partySaveStates[guest.id] === 'saving'}
              className={`w-full bg-green-500 text-white ${styles.actionButton} ${styles.saveButton}`}
              onClick={() => handleRecipientRsvp(guest, 'Attending')}
            >
              <Smile aria-hidden="true" className="mr-2 shrink-0 text-white" />
              Accept
            </Button>
            <Button
              type="button"
              variant="destructive"
              aria-pressed={normalizeRsvp(formData.rsvp) === 'Not Attending'}
              disabled={partySaveStates[guest.id] === 'saving'}
              className={`w-full bg-red-500 text-white ${styles.actionButton} ${styles.cancelButton}`}
              onClick={() => handleRecipientRsvp(guest, 'Not Attending')}
            >
              <Frown aria-hidden="true" className="mr-2 shrink-0 text-white" />
              Decline
            </Button>
            </div>}
            {accessToken && partySaveStates[guest.id] && partySaveStates[guest.id] !== 'idle' && (
              <p
                aria-live="polite"
                role={partySaveStates[guest.id] === 'error' ? 'alert' : 'status'}
                className={styles.immediateSaveStatus}
                data-save-state={partySaveStates[guest.id]}
              >
                {partySaveStates[guest.id] === 'saving' ? immediateSaveCopy.saving : partySaveStates[guest.id] === 'saved' ? immediateSaveCopy.saved : immediateSaveCopy.retry}
              </p>
            )}
          </div>
          {!context.can_rsvp && <p className="text-sm">RSVP changes are currently closed by the organiser. You can still review and update the available details below.</p>}
        </section>
      )}
      {!editOnUpdate && !hasInvitedParty && canChangeRsvp && currentRsvp === 'Pending' && <p className="text-center text-sm font-medium">Please choose Accept or Decline to continue.</p>}
      {!editOnUpdate && !accessToken && !hasInvitedParty && canChangeRsvp && currentRsvp === 'Not Attending' && (
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
      {accessToken && songRequestsEnabled && songRequestsMax > 0 && isEditable && (
        <section className="space-y-3 rounded-xl border border-primary/40 bg-background p-3">
          <div className="space-y-1">
            <Label>Song Requests</Label>
            <p className="text-xs text-muted-foreground">Request up to {songRequestsMax} song{songRequestsMax === 1 ? '' : 's'} for the DJ. Leave blank to skip.</p>
          </div>
          {songRequests.map((entry, idx) => (
            <div key={idx} className="space-y-3 rounded-xl border border-primary/40 bg-background p-3">
              <p className="text-xs font-semibold text-primary">Song {idx + 1}</p>
              <div className="space-y-2"><Label htmlFor={`token-song-title-${idx}`}>Song Title</Label><Input id={`token-song-title-${idx}`} value={entry.song_title} onChange={(e) => setSongRequests((items) => items.map((item, index) => index === idx ? { ...item, song_title: e.target.value } : item))} placeholder="e.g. Sweet Caroline" maxLength={150} className="border-primary w-full" /></div>
              <div className="space-y-2"><Label htmlFor={`token-song-artist-${idx}`}>Artist Name</Label><Input id={`token-song-artist-${idx}`} value={entry.artist_name} onChange={(e) => setSongRequests((items) => items.map((item, index) => index === idx ? { ...item, artist_name: e.target.value } : item))} placeholder="e.g. Neil Diamond" maxLength={150} className="border-primary w-full" /></div>
              <div className="space-y-2"><Label htmlFor={`token-song-link-${idx}`}>Music Link (optional)</Label><Input id={`token-song-link-${idx}`} type="url" value={entry.music_link} onChange={(e) => setSongRequests((items) => items.map((item, index) => index === idx ? { ...item, music_link: e.target.value } : item))} placeholder="Spotify, YouTube or Apple Music link" maxLength={500} className="border-primary w-full" /></div>
              <div className="space-y-2"><Label htmlFor={`token-song-note-${idx}`}>Note (optional)</Label><Textarea id={`token-song-note-${idx}`} value={entry.note} onChange={(e) => setSongRequests((items) => items.map((item, index) => index === idx ? { ...item, note: e.target.value } : item))} placeholder="Anything the DJ should know" rows={2} maxLength={500} className="border-primary w-full" /></div>
            </div>
          ))}
        </section>
      )}
      {(editOnUpdate ? editorVisible && context.can_edit : detailsUnlocked) && <>
      <div ref={detailsRef} className="space-y-4 rounded-xl border border-primary/40 bg-background p-3">
      <div className={styles.selectedMemberPanel} aria-live="polite">
        <strong>{context.guest.first_name} {context.guest.last_name}</strong>
        <span>- {familyCopy.updateBelow}</span>
      </div>
      {context.allow_name_edit && (
        <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-2 gap-3">
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
      {groupEditorId !== selectedId && <>
      <GuestRelationField context={context} value={relation} onChange={setRelation}/>
      <div className="space-y-2">
        <Label htmlFor="dietary">Dietary Requirements</Label>
        <GuestDietarySelect id="dietary" value={formData.dietary} onChange={dietary=>setFormData({...formData,dietary})} disabled={!isEditable}/>
      </div>
      </>}
      {event?.collect_guest_addresses && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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

      <AlertDialog open={confirmRsvp} onOpenChange={setConfirmRsvp}><AlertDialogContent className="ww-public-live-dialog z-[11000]"><AlertDialogHeader><AlertDialogTitle>RSVP Already Submitted</AlertDialogTitle><AlertDialogDescription>You have already responded to this invitation. Changing your RSVP may affect seating arrangements, catering, and event planning. Are you sure you want to send this update to the organiser?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={()=>handleSave(true, pendingSwitch || undefined)} disabled={saving}>Yes, Update RSVP</AlertDialogAction><AlertDialogCancel onClick={()=>setFormData({...formData,rsvp:initialRsvp})}>Keep Current RSVP</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>

    </div>
  );

  const footerButtons = (
    <>
      <AlertDialog open={Boolean(pendingSwitch)} onOpenChange={(value) => { if (!value && !saving) setPendingSwitch(null); }}>
        <AlertDialogContent className="ww-public-live-dialog z-[11000]">
          <AlertDialogHeader><AlertDialogTitle>{detailsCopy.title}</AlertDialogTitle><AlertDialogDescription>{familyCopy.switchWarning}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row">
            <Button disabled={saving} className={`bg-green-500 text-white ${styles.saveButton}`} onClick={() => handleSave(false, pendingSwitch!)}>{familyCopy.saveSwitch}</Button>
            <Button disabled={saving} variant="destructive" onClick={() => switchMember(pendingSwitch!)}>{familyCopy.discardSwitch}</Button>
            <AlertDialogCancel disabled={saving}>{detailsCopy.keep}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmClose} onOpenChange={(next) => { setConfirmClose(next); if (!next) onDismissCancel?.(); }}>
        <AlertDialogContent className="ww-public-live-dialog z-[11000]">
          <AlertDialogHeader>
            <AlertDialogTitle>{detailsCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{detailsCopy.warning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{detailsCopy.keep}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmClose(false); onOpenChange(false); }}>{detailsCopy.discard}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isEditable && (
        <Button onClick={()=>handleSave()} disabled={saving || !context?.can_edit || (!accessToken && !context?.is_manager && !hasInvitedParty && canChangeRsvp && currentRsvp !== 'Attending')}
          className={`flex-1 bg-green-500 text-white ${styles.actionButton} ${styles.saveButton} ${styles.footerButton}`}>
          {saving ? <Loader2 className="mr-2 animate-spin text-white" /> : <Smile aria-hidden="true" className="mr-2 shrink-0 text-white" />}
          {detailsCopy.save}
        </Button>
      )}
      <Button variant="destructive" onClick={requestClose} disabled={saving}
        className={`${isEditable ? 'flex-1' : 'w-full'} bg-red-500 text-white ${styles.actionButton} ${styles.cancelButton} ${styles.footerButton}`}>
        <Frown aria-hidden="true" className="mr-2 shrink-0 text-white" />
        {detailsCopy.close}
      </Button>
    </>
  );

  if (inline) {
    return <section data-qr-rsvp-inline data-expanded={open} className="ww-public-live-dialog mt-5 rounded-xl border border-primary/40 overflow-hidden">
      <header className="px-4 pt-5 pb-3 border-b"><h2 className={styles.dialogHeading}><button type="button" data-inline-editor-toggle aria-expanded={open} onClick={() => open ? requestClose() : onOpenChange(true)} className="relative flex w-full items-center justify-center"><span data-qr-action-label>{headerTitle}</span><span aria-hidden="true" style={{position:'absolute',insetInlineEnd:20,top:'50%',width:10,height:10,borderRight:'2px solid currentColor',borderBottom:'2px solid currentColor',transform:open?'translateY(-50%) rotate(225deg)':'translateY(-50%) rotate(45deg)'}} /></button></h2></header>
      {open && <><div ref={scrollRef} className="px-3 py-4 sm:px-6">{formBody}</div>
      {context?.can_edit && <div className="flex flex-row gap-3 border-t px-3 py-4 sm:px-6">{footerButtons}</div>}</>}
    </section>;
  }

  // MOBILE: render as a true body-portal bottom sheet, independent of any
  // page/card transforms, overflow clipping, or dialog primitives.
  if (isMobile && open && typeof document !== 'undefined') {
    return createPortal(
      <div className="ww-public-live-dialog fixed inset-0 z-[9999] overflow-hidden" role="dialog" aria-modal="true">
        <div
          className="fixed inset-0 bg-black/60"
          onClick={requestClose}
        />
        <div
          className="fixed inset-x-0 top-0 bottom-0 z-[10000] flex w-full min-w-0 max-w-[100vw] flex-col overflow-hidden bg-background shadow-2xl"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', maxHeight: '100dvh' }}
        >
          <div className={`relative shrink-0 px-4 pt-5 pb-3 border-b bg-background ${styles.headerDivider} ${styles.modalHeader}`}>
            <h2 className={`text-center text-lg font-semibold text-primary pr-10 ${styles.dialogHeading}`}>
              {headerTitle}
            </h2>
            <button
              type="button"
              aria-label={detailsCopy.close}
              onClick={requestClose}
              className="absolute right-3 top-3 inline-flex items-center justify-center h-9 w-9 rounded-full border-2 border-primary bg-white"
            >
              <X className="h-4 w-4 text-primary" />
            </button>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-5 pb-8"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {formBody}
          </div>
          {context?.can_edit && (
            <div
              className="z-50 flex shrink-0 flex-row gap-3 bg-background border-t px-4 py-4"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
            >
              {footerButtons}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // DESKTOP / TABLET (>=1024px): unchanged dialog
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : requestClose()}>
      <DialogContent aria-describedby={undefined} className={`ww-public-live-dialog sm:max-w-[720px] sm:max-h-[90vh] flex flex-col p-0 gap-0 ${styles.modalShell}`}>
        <DialogHeader className={`px-6 pt-6 pb-4 shrink-0 border-b ${styles.headerDivider} ${styles.modalHeader}`}>
          <DialogTitle className={`text-primary ${styles.dialogHeading}`}>{headerTitle}</DialogTitle>
        </DialogHeader>
        <div ref={scrollRef} className="px-6 py-4 overflow-y-auto flex-1">{formBody}</div>
        {context?.can_edit && (
          <div className="flex shrink-0 flex-row gap-3 bg-background px-6 py-4 border-t sm:justify-center">
            {footerButtons}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};


