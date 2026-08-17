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
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';

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
}

interface SongRequestEntry {
  song_title: string;
  artist_name: string;
  music_link: string;
  note: string;
}

const dietaryOptions = [
  'NA',
  'Vegetarian',
  'Vegan',
  'Gluten Free',
  'Dairy Free',
  'Nut Allergy',
  'Shellfish Allergy',
  'Halal',
  'Kosher',
  'Other'
];

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
}) => {
  const isMobile = useIsMobile();
  const [saving, setSaving] = useState(false);
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
    if (guest) {
      const currentRsvp = guest.rsvp || 'Pending';
      setInitialRsvp(currentRsvp);
      setFormData({
        rsvp: currentRsvp,
        first_name: guest.first_name || '',
        last_name: guest.last_name || '',
        mobile: guest.mobile || '',
        email: guest.email || '',
        dietary: guest.dietary || 'NA',
        notes: guest.notes || '',
        mailing_address: guest.mailing_address || '',
        mailing_suburb: guest.mailing_suburb || '',
        mailing_state: guest.mailing_state || '',
        mailing_postcode: guest.mailing_postcode || ''
      });
    }
}, [guest, open]);

  // Fetch the freshest guest row when the modal opens to avoid stale data
  useEffect(() => {
    const fetchLatestGuest = async () => {
      if (!open || !guest?.id) return;
      const { data, error } = await supabase
        .from('guests')
        .select('first_name, last_name, mobile, email, dietary, notes, rsvp, mailing_address, mailing_suburb, mailing_state, mailing_postcode')
        .eq('id', guest.id)
        .maybeSingle();
      if (!error && data) {
        const currentRsvp = data.rsvp || 'Pending';
        setInitialRsvp(currentRsvp);
        setFormData({
          rsvp: currentRsvp,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          mobile: data.mobile || '',
          email: data.email || '',
          dietary: data.dietary || 'NA',
          notes: data.notes || '',
          mailing_address: (data as any).mailing_address || '',
          mailing_suburb: (data as any).mailing_suburb || '',
          mailing_state: (data as any).mailing_state || '',
          mailing_postcode: (data as any).mailing_postcode || ''
        });
      }
    };
    fetchLatestGuest();
  }, [open, guest?.id]);

  const handleSave = async () => {
    if (!guest) return;

    setSaving(true);
    try {
      console.log('🔄 [Guest Update] Starting update for guest:', guest.id);
      console.log('📝 [Guest Update] Form data:', {
        rsvp: formData.rsvp,
        dietary: formData.dietary,
        mobile: formData.mobile,
        email: formData.email,
        notes: formData.notes
      });

      // Use RPC function to bypass RLS for public updates
      const addressesEnabled = !!event?.collect_guest_addresses;
      const { data, error } = await supabase.rpc('update_guest_rsvp_public', {
        _guest_id: guest.id,
        _event_id: guest.event_id || event?.id,
        _rsvp: formData.rsvp !== initialRsvp ? formData.rsvp : null,
        _dietary: formData.dietary,
        _mobile: formData.mobile?.trim() || null,
        _email: formData.email?.trim() || null,
        _notes: formData.notes?.trim() || null,
        _mailing_address: addressesEnabled ? (formData.mailing_address?.trim() || null) : null,
        _mailing_suburb: addressesEnabled ? (formData.mailing_suburb?.trim() || null) : null,
        _mailing_state: addressesEnabled ? (formData.mailing_state?.trim() || null) : null,
        _mailing_postcode: addressesEnabled ? (formData.mailing_postcode?.trim() || null) : null
      });

      if (error) {
        console.error('❌ [Guest Update] RPC error:', error);
        throw error;
      }
      if (!data) {
        console.error('❌ [Guest Update] No data returned - event may not allow public updates');
        throw new Error('Update failed - event may not allow public updates');
      }

      console.log('✅ [Guest Update] Successfully updated guest data');

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
        description: 'Failed to update information. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!guest) return null;

  const headerTitle = 'Update Your Information';
  const headerSubtitle = (
    <div className="text-sm text-foreground space-y-1">
      <span className="block">{helperText || "Please update, edit your details & save below."}</span>
      <span className="block">You're info will automatically be sent to the event organiser</span>
    </div>
  );

  const formBody = !isEditable ? (
    <div className="text-center space-y-2">
      <p className="text-sm font-medium text-destructive">
        RSVP date has passed. Please contact the organiser to make changes.
      </p>
    </div>
  ) : (
    <div className="space-y-4">
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
      {event?.collect_guest_addresses && (
        <>
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
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor="dietary">Dietary Requirements</Label>
        <Select value={formData.dietary}
          onValueChange={(value) => setFormData({ ...formData, dietary: value })}
          disabled={!isEditable}>
          <SelectTrigger id="dietary" className="border-primary w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="ww-public-live-menu">
            {dietaryOptions.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {allowNameEdit && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="First name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Last name" />
          </div>
        </div>
      )}
      {(() => {
        if (!guest?.family_group || allGuests.length === 0) return null;
        const groupMembers = allGuests.filter(
          (g: any) => g.family_group === guest.family_group && g.id !== guest.id
        );
        if (groupMembers.length === 0) return null;
        const guestFullName = `${guest.first_name} ${guest.last_name || ''}`.trim();
        const groupType = groupMembers.length === 1 ? 'Couple' : 'Family';
        return (
          <div className="border border-primary rounded-xl p-3 space-y-2 bg-primary/5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                {guestFullName} is part of a {groupType}
              </p>
            </div>
            <ul className="space-y-1 pl-6">
              {groupMembers.map((m: any) => (
                <li key={m.id} className="text-sm text-foreground">
                  • {m.first_name} {m.last_name || ''}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </div>
  );

  const footerButtons = (
    <>
      {isEditable && (
        <Button onClick={handleSave} disabled={saving}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-full py-2">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      )}
      <Button variant="destructive" onClick={() => onOpenChange(false)} disabled={saving}
        className={`${isEditable ? 'flex-1' : 'w-full'} bg-red-500 hover:bg-red-600 text-white rounded-full py-2`}>
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
      <DialogContent className="ww-public-live-dialog sm:max-w-[500px] sm:max-h-[90vh] flex flex-col p-0 gap-0">
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
