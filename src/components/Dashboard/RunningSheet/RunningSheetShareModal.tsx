/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This Running Sheet feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break running sheet data, sharing, or PDF export
 *
 * Last locked: 2026-04-02
 */
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Trash2, ExternalLink, Users } from 'lucide-react';
import { RunningSheetShareToken } from '@/types/runningSheet';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { buildRunningSheetUrl } from '@/lib/urlUtils';

interface RunningSheetShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareTokens: RunningSheetShareToken[];
  onGenerateToken: (permission: 'view_only' | 'can_edit', recipientName?: string, validityDays?: number) => Promise<string | null>;
  onDeleteToken: (tokenId: string) => void;
  eventSlug?: string;
}

export function RunningSheetShareModal({
  open,
  onOpenChange,
  shareTokens,
  onGenerateToken,
  onDeleteToken,
  eventSlug,
}: RunningSheetShareModalProps) {
  const [recipientName, setRecipientName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const token = await onGenerateToken('view_only', recipientName || undefined, 90);
    setGenerating(false);
    if (token) {
      const url = buildRunningSheetUrl(token, eventSlug);
      await navigator.clipboard.writeText(url);
      toast({ title: 'Share Link Created', description: 'Link copied to clipboard' });
      setRecipientName('');
    }
  }, [recipientName, onGenerateToken, toast]);

  const copyLink = useCallback(async (token: string) => {
    const url = buildRunningSheetUrl(token, eventSlug);
    await navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Link Copied', description: 'Share link copied to clipboard' });
  }, [toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Share Running Sheet
          </DialogTitle>
          <DialogDescription>
            Share this running sheet with your DJ, MC, venue, or wedding party.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
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

            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Generate & Copy Link
            </Button>
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            {shareTokens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No share links created yet</div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {shareTokens.map((token) => (
                  <div key={token.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{token.recipient_name || 'Unnamed'}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">View Only</span>
                        {token.last_accessed_at && (
                          <span>Last used: {format(new Date(token.last_accessed_at), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy Link" onClick={() => copyLink(token.token)}>
                        {copiedId === token.token ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Open Link" asChild>
                        <a href={buildRunningSheetUrl(token.token, eventSlug)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete Link" onClick={() => onDeleteToken(token.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
