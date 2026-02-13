import React, { memo, useCallback, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type LocationDetails = {
  address: string;
  phone: string;
  contact: string;
};

export interface LocationDetailsPopoverProps {
  address: string;
  phone: string;
  contact: string;
  inputClass?: string;
  onSave: (next: LocationDetails) => void;
}

export const LocationDetailsPopover = memo(function LocationDetailsPopover({
  address,
  phone,
  contact,
  inputClass,
  onSave,
}: LocationDetailsPopoverProps) {
  const [open, setOpen] = useState(false);

  const [localAddress, setLocalAddress] = useState(address ?? '');
  const [localPhone, setLocalPhone] = useState(phone ?? '');
  const [localContact, setLocalContact] = useState(contact ?? '');

  const hasDetails = useMemo(
    () => Boolean((address ?? '') || (phone ?? '') || (contact ?? '')),
    [address, phone, contact],
  );

  const handleOpen = useCallback(() => {
    // Sync from parent values only when opening (avoids parent re-renders while typing)
    setLocalAddress(address ?? '');
    setLocalPhone(phone ?? '');
    setLocalContact(contact ?? '');
    setOpen(true);
  }, [address, phone, contact]);

  const handleCancel = useCallback(() => {
    setOpen(false);
  }, []);

  const handleSave = useCallback(() => {
    onSave({ address: localAddress, phone: localPhone, contact: localContact });
    setOpen(false);
  }, [localAddress, localPhone, localContact, onSave]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        // Match existing behavior: opening syncs values; closing is only via buttons.
        if (nextOpen) handleOpen();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start font-normal rounded-full border-2 focus-visible:border-[3px] focus-visible:ring-0 focus-visible:outline-none',
            hasDetails 
              ? 'border-green-500 hover:border-green-500 text-foreground' 
              : 'border-[#7248e6] hover:border-[#7248e6] text-muted-foreground',
          )}
        >
          <MapPin className="mr-2 h-4 w-4" />
          {hasDetails ? 'Details Added' : 'Add Details'}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-4 space-y-3"
        align="start"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="space-y-1.5">
          <Label className="text-xs">Address</Label>
          <Input
            value={localAddress}
            onChange={(e) => setLocalAddress(e.target.value)}
            placeholder="Enter venue address"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Venue Phone Number</Label>
          <Input
            value={localPhone}
            onChange={(e) => setLocalPhone(e.target.value)}
            placeholder="Enter phone number"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Venue Contact Person</Label>
          <Input
            value={localContact}
            onChange={(e) => setLocalContact(e.target.value)}
            placeholder="Enter contact person name"
            className={inputClass}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button size="sm" className="rounded-full bg-red-500 hover:bg-red-600 text-white" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" className="rounded-full bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
