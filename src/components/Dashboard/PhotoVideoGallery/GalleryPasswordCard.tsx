// Host card for managing optional password protection on the gallery.
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LockKeyhole, LoaderCircle, Save, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  passwordEnabled: boolean;
  hasPassword: boolean;
  onSave: (args: { enabled: boolean; password: string | null }) => Promise<void>;
}

export const GalleryPasswordCard: React.FC<Props> = ({ passwordEnabled, hasPassword, onSave }) => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean>(passwordEnabled);
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { setEnabled(passwordEnabled); }, [passwordEnabled]);

  const needsNewPassword = enabled && !hasPassword; // turning on for the first time
  const canSave = enabled !== passwordEnabled || pw.length > 0;

  const submit = async () => {
    if (saving) return;
    if (enabled && !hasPassword && pw.trim().length < 4) {
      toast({ title: 'Password too short', description: 'Use at least 4 characters.', variant: 'destructive' });
      return;
    }
    if (enabled && pw && pw.trim().length < 4) {
      toast({ title: 'Password too short', description: 'Use at least 4 characters.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await onSave({ enabled, password: pw.length > 0 ? pw : null });
      toast({ title: enabled ? 'Gallery password saved successfully.' : 'Password protection turned off' });
      setPw('');
    } catch (e: any) {
      // Never surface raw Postgres errors to the organiser.
      const msg = /unauthorized/i.test(e?.message || '')
        ? "You don't have permission to change this event's gallery password."
        : /at least 4/i.test(e?.message || '')
          ? 'Password must be at least 4 characters.'
          : 'We could not save your password. Please try again.';
      toast({ title: 'Could not save', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="dashboard-card p-4 sm:p-5 space-y-4 overflow-hidden">
      <div className="flex items-start gap-3">
        <LockKeyhole className="h-5 w-5 text-[#967A59] mt-0.5 shrink-0" strokeWidth={1.8} />
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-black" style={{ color: '#000000' }}>Password Protection</h3>
          <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
            Add a password to control who can upload or view the gallery.
          </p>
        </div>
      </div>


      <div className="flex items-center justify-between gap-3 pt-1">
        <Label htmlFor="pw-enabled" className="text-sm font-medium">
          {enabled ? 'Password is on' : 'Password is off'}
        </Label>
        <Switch
          id="pw-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
          className="w-12 h-6 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
        />
      </div>

      {enabled && (
        <div className="space-y-2">
          <Label htmlFor="pw-input" className="text-sm font-medium">
            {hasPassword ? 'Change password (leave empty to keep current)' : 'Set a password'}
          </Label>
          <div className="relative">
            <Input
              id="pw-input"
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={hasPassword ? '••••••' : 'At least 4 characters'}
              className="h-11 text-base pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="h-4 w-4" strokeWidth={1.8} /> : <Eye className="h-4 w-4" strokeWidth={1.8} />}
            </button>
          </div>
          {hasPassword && !needsNewPassword && (
            <p className="text-xs text-muted-foreground">A password is already saved. Type a new one to replace it.</p>
          )}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          onClick={submit}
          disabled={saving || !canSave}
          className="lv-premium-shade h-11 bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? <><LoaderCircle className="animate-spin h-4 w-4 mr-2" strokeWidth={1.8} /> Saving…</> : <><Save className="h-4 w-4 mr-2" strokeWidth={1.8} /> Save</>}
        </Button>
      </div>
    </Card>
  );
};

export default GalleryPasswordCard;
