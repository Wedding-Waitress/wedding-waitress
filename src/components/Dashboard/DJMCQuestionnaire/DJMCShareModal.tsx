/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, CircleCheck, Trash2, ExternalLink, UsersRound, Lock, Unlock, Share2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DJMCShareToken } from '@/types/djMCQuestionnaire';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { buildDJQuestionnaireUrl } from '@/lib/urlUtils';
import { supabase } from '@/integrations/supabase/client';
import theme from './DJMCQuestionnaireTheme.module.css';

interface DJMCShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareTokens: DJMCShareToken[];
  onGenerateToken: (
    permission: 'view_only' | 'can_edit',
    recipientName?: string,
    validityDays?: number
  ) => Promise<string | null>;
  onDeleteToken: (tokenId: string) => void;
  onTokensUpdated?: () => void;
  eventSlug?: string;
}

export function DJMCShareModal({
  open,
  onOpenChange,
  shareTokens,
  onGenerateToken,
  onDeleteToken,
  onTokensUpdated,
  eventSlug,
}: DJMCShareModalProps) {
  const [permission, setPermission] = useState<'view_only' | 'can_edit'>('view_only');
  const [recipientName, setRecipientName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const token = await onGenerateToken(permission, recipientName || undefined, 90);
      if (token) {
        const url = buildDJQuestionnaireUrl(token, eventSlug);
        await navigator.clipboard.writeText(url);
        toast({ className: 'ww-djmc-toast', title: 'Share Link Created', description: 'Link copied to clipboard' });
        setRecipientName('');
      }
    } finally {
      setGenerating(false);
    }
  }, [permission, recipientName, onGenerateToken, toast, eventSlug]);

  const copyLink = useCallback(async (token: string) => {
    const url = buildDJQuestionnaireUrl(token, eventSlug);
    await navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      className: 'ww-djmc-toast',
      title: 'Link Copied',
      description: 'Share link copied to clipboard',
    });
  }, [toast, eventSlug]);

  const toggleTokenPermission = useCallback(async (tokenId: string, currentPermission: string) => {
    const newPermission = currentPermission === 'can_edit' ? 'view_only' : 'can_edit';
    try {
      const { error } = await supabase
        .from('dj_mc_share_tokens')
        .update({ permission: newPermission })
        .eq('id', tokenId);
      if (error) throw error;
      onTokensUpdated?.();
      toast({ className: 'ww-djmc-toast', title: 'Updated', description: `Link set to ${newPermission === 'can_edit' ? 'Can Edit' : 'View Only'}` });
    } catch (error) {
      console.error('Error updating DJ/MC share-token permission:', error);
      toast({ className: 'ww-djmc-toast', title: 'Update failed', description: 'The link permission was not changed.', variant: 'destructive' });
    }
  }, [onTokensUpdated, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${theme.shareModal} max-w-lg`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound size={18} strokeWidth={1.8} className="text-primary" />
            Share Questionnaire
          </DialogTitle>
          <DialogDescription>
            Share this questionnaire with your DJ, MC, venue, or wedding party.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-4">
          <TabsList className={`${theme.shareTabs} grid w-full grid-cols-2`}>
            <TabsTrigger value="create">Create Link</TabsTrigger>
            <TabsTrigger value="manage">
              Manage ({shareTokens.length})
            </TabsTrigger>
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
              <Label htmlFor="permission">Permission Level</Label>
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as 'view_only' | 'can_edit')}
              >
                <SelectTrigger id="permission">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="ww-djmc-portal">
                  <SelectItem value="view_only">
                    <div className="flex flex-col items-start">
                      <span>View Only</span>
                      <span className={`${theme.bodyText} text-muted-foreground`}>
                        Can see but not edit
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="can_edit">
                    <div className="flex flex-col items-start">
                      <span>Can Edit</span>
                      <span className={`${theme.bodyText} text-muted-foreground`}>
                        Can modify entries
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className={`${theme.primaryAction} w-full`}
            >
              {generating ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Copy size={18} strokeWidth={1.8} className=" mr-2" />
              )}
              Generate & Copy Link
            </Button>
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            {shareTokens.length === 0 ? (
              <div className={`text-center py-8 text-muted-foreground ${theme.bodyText}`}>
                No share links created yet
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {shareTokens.map((token) => {
                  const expired = Boolean(token.expires_at && new Date(token.expires_at).getTime() <= Date.now());
                  return (
                  <div
                    key={token.id}
                    className={`${theme.managedLink} flex items-center justify-between p-3 rounded-lg`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`${theme.bodyText} truncate`}>
                        {token.recipient_name || 'Unnamed'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded ${
                          token.permission === 'can_edit'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {token.permission === 'can_edit' ? 'Can Edit' : 'View Only'}
                        </span>
                        <span className={theme.bodyText}>{expired ? 'Expired' : 'Active'}</span>
                        <span className={theme.bodyText}>Last used: {token.last_accessed_at ? format(new Date(token.last_accessed_at), 'MMM d, yyyy') : 'Never'}</span>
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
                            >
                              {token.permission === 'can_edit' ? (
                                <Unlock size={18} strokeWidth={1.8} className=" text-green-500" />
                              ) : (
                                <Lock size={18} strokeWidth={1.8} className=" text-red-500" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="ww-djmc-portal">
                            {token.permission === 'can_edit' ? 'Switch to View Only' : 'Switch to Can Edit'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyLink(token.token)}
                            >
                              {copiedId === token.token ? (
                                <CircleCheck size={18} strokeWidth={1.8} className=" text-green-600" />
                              ) : (
                                <Copy size={18} strokeWidth={1.8} className="" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="ww-djmc-portal">Copy Link</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                            >
                              <a
                                href={buildDJQuestionnaireUrl(token.token, eventSlug)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink size={18} strokeWidth={1.8} className="" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="ww-djmc-portal">Open Link</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onDeleteToken(token.id)}
                            >
                              <Trash2 size={18} strokeWidth={1.8} className=" text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="ww-djmc-portal">Delete Link</TooltipContent>
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
