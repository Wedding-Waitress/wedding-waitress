import React from 'react';
import { Switch } from '@/components/ui/switch';
import {
  ShieldCheck,
  Clock3,
  ClipboardCheck,
  UserPlus,
  UserRoundCog,
} from 'lucide-react';
import { useLiveViewModuleSettings } from '@/hooks/useLiveViewModuleSettings';

interface KioskAutoProtectionProps {
  eventId: string;
}

const autoLockKeys = [
  { key: 'rsvp_override_auto_lock', label: 'Keep RSVP Accept / Decline available', Icon: ClipboardCheck },
  { key: 'plus_one_override_auto_lock', label: 'Keep Add +1 Guest available', Icon: UserPlus },
  { key: 'update_details_override_auto_lock', label: 'Keep Update Your Details available', Icon: UserRoundCog },
] as const;

export const KioskAutoProtection: React.FC<KioskAutoProtectionProps> = ({ eventId }) => {
  const { settings: modules, updateModuleConfig } = useLiveViewModuleSettings(eventId);
  const rsvpConf = (modules as any)?.rsvp_invite_config || {};

  return (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
        <h3 className="text-[20px] font-bold text-[#472c1d]">7-Day Auto-Protection</h3>
      </div>
      <p className="text-xs text-muted-foreground flex items-start gap-[7px]">
        <Clock3 className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.8} aria-hidden="true" />
        <span>
          In the 7 days before your event, RSVP, +1 and Update Details are automatically hidden from
          guests in the Live View. Turn any toggle ON to keep that action available during the final week.
        </span>
      </p>
      <div className="space-y-2 pt-2">
        {autoLockKeys.map(({ key, label, Icon }) => {
          const checked = !!rsvpConf[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm inline-flex items-center gap-[7px]">
                <Icon className="h-4 w-4 shrink-0 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
                {label}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs whitespace-nowrap ${checked ? 'text-green-600' : 'text-red-500'}`}>
                  {checked ? 'Override ON' : 'Auto-hide'}
                </span>
                <Switch
                  checked={checked}
                  onCheckedChange={(c) =>
                    updateModuleConfig('rsvp_invite_config' as any, { ...rsvpConf, [key]: c })
                  }
                  className="data-[state=checked]:bg-success data-[state=unchecked]:border data-[state=unchecked]:border-[#967A59]/70"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
