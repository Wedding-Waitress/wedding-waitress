import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Copy, CircleCheck, Trash2, ExternalLink, Lock, Unlock, LoaderCircle, Share2 } from 'lucide-react';
import { PhotoShare } from '@/types/photoCallout';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {buildPhotoCalloutUrl} from '@/lib/photoCalloutShareUrl';
import { photoDb as supabase } from '@/hooks/usePhotoCallout';
import styles from '../RunningSheet/RunningSheetTheme.module.css';

interface PhotoCalloutShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareTokens: PhotoShare[];
  onGenerateToken: (permission: 'view_only' | 'can_check', recipientName?: string, validityDays?: number) => Promise<string | null>;
  onDeleteToken: (tokenId: string) => void;
  onTokensUpdated?: () => void;
  eventSlug?: string;
  eventDate?: string | null;
}

export function PhotoCalloutShareModal({
  open,
  onOpenChange,
  shareTokens,
  onGenerateToken,
  onDeleteToken,
  onTokensUpdated,
  eventSlug,
  eventDate,
}: PhotoCalloutShareModalProps) {
  const [permission, setPermission] = useState<'view_only' | 'can_check'>('view_only');
  const [recipientName, setRecipientName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const token = await onGenerateToken(permission, recipientName || undefined, 90);
      if (token) {
        setRecipientName('');
        try {
          await navigator.clipboard.writeText(buildPhotoCalloutUrl(token, eventSlug, eventDate));
          toast({ title: 'Share Link Created', description: 'Link copied to clipboard' });
        } catch {
          toast({ title: 'Link created', description: 'Copying failed. Find the link in Manage and try again.' });
        }
      }
    } catch {
      toast({ title: 'Link not created', description: 'Please try again.', variant: 'destructive' });
    } finally { setGenerating(false); }
  }, [permission, recipientName, onGenerateToken, toast, eventSlug, eventDate]);

  const copyLink = useCallback(async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildPhotoCalloutUrl(token, eventSlug, eventDate));
      setCopiedId(token);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: 'Link Copied', description: 'Share link copied to clipboard' });
    } catch {
      toast({ title: 'Could not copy link', description: 'Please try again.', variant: 'destructive' });
    }
  }, [toast, eventSlug, eventDate]);

  const openLink = useCallback((token: string) => {
    const url = buildPhotoCalloutUrl(token, eventSlug, eventDate);
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (openedWindow) openedWindow.opener = null;
  }, [eventSlug, eventDate]);

  const toggleTokenPermission = useCallback(async (tokenId: string, currentPermission: string) => {
    const newPermission = currentPermission === 'can_check' ? 'view_only' : 'can_check';
    try {
      const { error } = await supabase
        .from('photo_callout_shares')
        .update({ permission: newPermission })
        .eq('id', tokenId);
      if (error) {
        console.error('Error updating token permission:', error);
        toast({ title: 'Error', description: 'Failed to update permission', variant: 'destructive' });
        return;
      }
      onTokensUpdated?.();
      toast({ title: 'Updated', description: `Link set to ${newPermission === 'can_check' ? 'Can Tick Off' : 'View Only'}` });
    } catch (error) {
      console.error('Error updating token permission:', error);
      toast({ title: 'Error', description: 'Failed to update permission', variant: 'destructive' });
    }
  }, [onTokensUpdated, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-lg ${styles.shareModal}`} data-running-sheet-share-modal>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={18} strokeWidth={1.8} className="text-primary" aria-hidden="true" />
            Share Photo Call-Out Cards
          </DialogTitle>
          <DialogDescription>
            Share these photo call-out cards with your DJ, MC, venue, or wedding party.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-4">
          <TabsList className={`grid w-full grid-cols-2 ${styles.shareTabs}`}>
            <TabsTrigger value="create">Create Link</TabsTrigger>
            <TabsTrigger value="manage">Manage ({shareTokens.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Name (Optional)</Label>
              <Input
                id="recipient"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g., DJ Mark, Venue Coordinator"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rs-permission">Permission Level</Label>
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as 'view_only' | 'can_check')}
              >
                <SelectTrigger id="rs-permission" className={styles.darkControl}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={styles.permissionMenu}>
                  <SelectItem value="view_only">
                    <div className="flex flex-col items-start">
                      <span>View Only</span>
                      <span className="text-xs text-muted-foreground">Can see but not edit</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="can_check">
                    <div className="flex flex-col items-start">
                      <span>Can Tick Off</span>
                      <span className="text-xs text-muted-foreground">Can tick off completed photos</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerate} disabled={generating} className={`w-full ${styles.primaryAction}`}>
              {generating ? (
                <LoaderCircle size={18} strokeWidth={1.8} className="animate-spin mr-2" aria-hidden="true" />
              ) : (
                <Copy size={18} strokeWidth={1.8} className="mr-2" aria-hidden="true" />
              )}
              Generate & Copy Link
            </Button>
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            {shareTokens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No share links created yet</div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {shareTokens.map((token) => {
                  const isExpired = !!token.expires_at && new Date(token.expires_at).getTime() <= Date.now();
                  return (
                  <div key={token.id} className={`flex items-center justify-between gap-2 p-3 rounded-lg ${styles.managedLinkCard}`} data-link-state={isExpired ? 'expired' : 'active'}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{(token.recipient_name?.trim().toLowerCase() === 'photo call-out cards' ? 'Photo Call-Out Cards' : token.recipient_name?.trim()) || 'Unnamed'}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded ${
                          isExpired
                            ? styles.expiredBadge
                            : token.permission === 'can_check'
                            ? styles.editBadge
                            : styles.viewBadge
                        }`}>
                          {isExpired ? 'Expired' : token.permission === 'can_check' ? 'Can Tick Off' : 'View Only'}
                        </span>
                        {token.last_accessed_at && (
                          <span>Last used: {format(new Date(token.last_accessed_at), 'd MMMM yyyy - h:mm a')}</span>
                        )}
                      </div>
                    </div>
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleTokenPermission(token.id, token.permission)}
                              aria-label="Toggle link permission"
                            >
                              {token.permission === 'can_check' ? (
                                <Unlock size={18} strokeWidth={1.8} className="text-green-500" aria-hidden="true" />
                              ) : (
                                <Lock size={18} strokeWidth={1.8} className="text-red-500" aria-hidden="true" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="ww-running-sheet-tooltip">
                            {token.permission === 'can_check' ? 'Switch to View Only' : 'Switch to Can Tick Off'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(token.token)} aria-label="Copy link" disabled={isExpired}>
                              {copiedId === token.token ? <CircleCheck size={18} strokeWidth={1.8} className="text-green-600" aria-hidden="true" /> : <Copy size={18} strokeWidth={1.8} aria-hidden="true" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="ww-running-sheet-tooltip">Copy Link</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLink(token.token)} aria-label="Open link" disabled={isExpired}>
                              <ExternalLink size={18} strokeWidth={1.8} aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="ww-running-sheet-tooltip">Open Link</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteToken(token.id)} aria-label="Delete link">
                              <Trash2 size={18} strokeWidth={1.8} className="text-destructive" aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="ww-running-sheet-tooltip">Delete Link</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
