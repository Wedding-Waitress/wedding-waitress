import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Crown, GripVertical, Plus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/enhanced-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Guest } from '@/hooks/useGuests';
import type { TableWithGuestCount } from '@/hooks/useTables';
import { getHeadParticipantName, type HeadSeatEntry } from '@/lib/headTable';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TableWithGuestCount;
  guests: Guest[];
  participant1?: string | null;
  participant2?: string | null;
  onSave: (tableId: string, order: HeadSeatEntry[]) => Promise<boolean>;
}

const entryKey = (entry: HeadSeatEntry) => entry.kind === 'guest' ? `guest:${entry.guest_id}` : `participant:${entry.participant}`;

export const HeadTableSeatingDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  table,
  guests,
  participant1,
  participant2,
  onSave,
}) => {
  const [order, setOrder] = useState<HeadSeatEntry[]>(table.head_seating_order);
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setOrder(table.head_seating_order);
  }, [open, table.head_seating_order]);

  const guestById = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);
  const usedGuestIds = new Set(order.flatMap((entry) => entry.kind === 'guest' ? [entry.guest_id] : []));
  const availableGuests = guests.filter((guest) =>
    !usedGuestIds.has(guest.id) && (guest.table_id === null || guest.table_id === table.id)
  );

  const labelFor = (entry: HeadSeatEntry) => entry.kind === 'participant'
    ? getHeadParticipantName(entry, participant1, participant2)
    : `${guestById.get(entry.guest_id)?.first_name ?? 'Guest'} ${guestById.get(entry.guest_id)?.last_name ?? ''}`.trim();

  const move = (index: number, offset: number) => {
    const destination = index + offset;
    if (destination < 0 || destination >= order.length) return;
    const next = [...order];
    [next[index], next[destination]] = [next[destination], next[index]];
    setOrder(next);
  };

  const addGuest = () => {
    if (!selectedGuestId || order.length >= table.limit_seats) return;
    const entry: HeadSeatEntry = { kind: 'guest', guest_id: selectedGuestId };
    const extraGuestCount = order.filter((item) => item.kind === 'guest').length;
    setOrder(extraGuestCount % 2 === 0 ? [entry, ...order] : [...order, entry]);
    setSelectedGuestId('');
  };

  const swapHosts = () => {
    const first = order.findIndex((entry) => entry.kind === 'participant' && entry.participant === 'primary_1');
    const second = order.findIndex((entry) => entry.kind === 'participant' && entry.participant === 'primary_2');
    if (first < 0 || second < 0) return;
    const next = [...order];
    [next[first], next[second]] = [next[second], next[first]];
    setOrder(next);
  };

  const dropAt = (targetIndex: number) => {
    if (!draggedKey) return;
    const sourceIndex = order.findIndex((entry) => entryKey(entry) === draggedKey);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;
    const next = [...order];
    const [entry] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, entry);
    setOrder(next);
    setDraggedKey(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(table.id, order);
    setSaving(false);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ww-tables-dialog max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crown size={20} aria-hidden="true" />Arrange Head Table Seating</DialogTitle>
          <DialogDescription>Left to right, as viewed by the guests.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedGuestId} onValueChange={setSelectedGuestId}>
              <SelectTrigger className="min-h-11 flex-1"><SelectValue placeholder="Add an unassigned guest" /></SelectTrigger>
              <SelectContent className="ww-tables-menu">
                {availableGuests.map((guest) => <SelectItem key={guest.id} value={guest.id}>{guest.first_name} {guest.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" className="min-h-11" onClick={addGuest} disabled={!selectedGuestId || order.length >= table.limit_seats}><Plus size={17} aria-hidden="true" />Add guest</Button>
            <Button type="button" className="min-h-11" variant="outline" onClick={swapHosts}><RefreshCw size={17} aria-hidden="true" />Swap Couple/Hosts</Button>
          </div>

          <div className="overflow-x-auto pb-2" aria-label="Head Table seating order">
            <div className="flex min-w-max items-end justify-center gap-2 rounded-2xl border border-[#C4A882] p-4">
              {order.map((entry, index) => (
                <div
                  key={entryKey(entry)}
                  draggable
                  onDragStart={() => setDraggedKey(entryKey(entry))}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropAt(index)}
                  className="w-36 rounded-xl border border-[#967A59] bg-background p-2 text-center"
                >
                  <GripVertical className="mx-auto mb-1 text-muted-foreground" size={16} aria-hidden="true" />
                  <div className="min-h-10 text-sm font-semibold">{labelFor(entry)}</div>
                  <div className="mt-2 flex justify-center gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label={`Move ${labelFor(entry)} left`} onClick={() => move(index, -1)} disabled={index === 0}><ArrowLeft size={15} /></Button>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Move ${labelFor(entry)} right`} onClick={() => move(index, 1)} disabled={index === order.length - 1}><ArrowRight size={15} /></Button>
                    {entry.kind === 'guest' && <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${labelFor(entry)}`} onClick={() => setOrder(order.filter((item) => entryKey(item) !== entryKey(entry)))}><X size={15} /></Button>}
                  </div>
                </div>
              ))}
              {order.length === 0 && <p className="text-sm text-muted-foreground">Add participants or guests to begin.</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{order.length} of {table.limit_seats} positions arranged. Guests already assigned to another table are unavailable.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save seating order'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
