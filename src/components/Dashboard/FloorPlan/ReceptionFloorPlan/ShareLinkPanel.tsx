/**
 * Phase 2D — Read-only share link for venue coordinators.
 * Generates a tokenised URL `/share/reception/:token`.
 */
import { useMemo, useState } from 'react';
import { Share2, Copy, Check, Link2Off, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import { ApprovalStatusPanel } from './ApprovalStatusPanel';
import styles from './ReceptionFloorPlanTheme.module.css';

interface Props {
  plan: ReceptionFloorPlan;
  onGenerate: () => Promise<string | null>;
  onRevoke: () => Promise<void>;
  onApprovalChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const ShareLinkPanel = ({ plan, onGenerate, onRevoke, onApprovalChange }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    if (!plan.share_token || !plan.share_enabled) return '';
    return `${window.location.origin}/share/reception/${plan.share_token}`;
  }, [plan.share_token, plan.share_enabled]);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        const t = await onGenerate();
        if (!t) toast({ title: 'Could not create share link', variant: 'destructive' });
        else toast({ title: 'Share link enabled', description: 'Anyone with the link can view (read-only).' });
      } else {
        await onRevoke();
        toast({ title: 'Share link revoked' });
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <div data-reception-panel="true" className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 max-lg:p-4">
      <div className="flex items-center justify-between gap-2 max-lg:flex-col max-lg:items-stretch">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Share with venue coordinator</h3>
        </div>
        <div className="flex items-center gap-3 max-lg:justify-between">
          <Label className="text-xs">Enable read-only link</Label>
          <Switch
            className={styles.shareToggle}
            data-reception-share-toggle="true"
            checked={plan.share_enabled && !!plan.share_token}
            onCheckedChange={toggle}
            disabled={busy}
          />
        </div>
      </div>

      {plan.share_enabled && plan.share_token ? (
        <div className="min-w-0 space-y-2">
          <div className={styles.shareLinkControls}>
            <input
              readOnly
              value={url}
              title={url}
              onFocus={(e) => e.currentTarget.select()}
              className={`${styles.shareUrlField} rounded-md border border-border bg-background px-3 py-2 text-sm font-mono`}
            />
            <div className={styles.shareLinkButtons}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copy}
                className="lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggle(false)}
                disabled={busy}
                className="lv-premium-shade h-9 max-lg:h-11 max-lg:flex-1 max-lg:text-base text-destructive hover:text-destructive"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Link2Off className="w-3.5 h-3.5 mr-1.5" />}
                Revoke
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Anyone with this link can view the floor plan. They cannot edit, download data, or see
            your guest list.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Generate a private link to share this floor plan with your venue coordinator. You can
          revoke it at any time.
        </p>
      )}

      <ApprovalStatusPanel plan={plan} onChange={onApprovalChange} />
    </div>
  );
};
