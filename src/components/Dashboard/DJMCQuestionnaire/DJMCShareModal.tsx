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
import { Copy, Check, Trash2, ExternalLink, Users } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DJMCShareToken } from '@/types/djMCQuestionnaire';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { buildDJQuestionnaireUrl } from '@/lib/urlUtils';
import { supabase } from '@/integrations/supabase/client';

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
  eventSlug?: string;
}

export function DJMCShareModal({
  open,
  onOpenChange,
  shareTokens,
  onGenerateToken,
  onDeleteToken,
  eventSlug,
}: DJMCShareModalProps) {
  const [permission, setPermission] = useState<'view_only' | 'can_edit'>('view_only');
  const [recipientName, setRecipientName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const token = await onGenerateToken(permission, recipientName || undefined, 90);
    setGenerating(false);

    if (token) {
      const url = buildDJQuestionnaireUrl(token, eventSlug);
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Share Link Created',
        description: 'Link copied to clipboard',
      });
      setRecipientName('');
    }
  }, [permission, recipientName, onGenerateToken, toast]);

  const copyLink = useCallback(async (token: string) => {
    const url = buildDJQuestionnaireUrl(token, eventSlug);
    await navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Link Copied',
      description: 'Share link copied to clipboard',
    });
  }, [toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Share Questionnaire
          </DialogTitle>
          <DialogDescription>
            Share this questionnaire with your DJ, MC, venue, or wedding party.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
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
                <SelectContent>
                  <SelectItem value="view_only">
                    <div className="flex flex-col items-start">
                      <span>View Only</span>
                      <span className="text-xs text-muted-foreground">
                        Can see but not edit
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="can_edit">
                    <div className="flex flex-col items-start">
                      <span>Can Edit</span>
                      <span className="text-xs text-muted-foreground">
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
              className="w-full"
            >
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
              <div className="text-center py-8 text-muted-foreground">
                No share links created yet
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {shareTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {token.recipient_name || 'Unnamed'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded ${
                          token.permission === 'can_edit'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {token.permission === 'can_edit' ? 'Can Edit' : 'View Only'}
                        </span>
                        {token.last_accessed_at && (
                          <span>
                            Last used: {format(new Date(token.last_accessed_at), 'MMM d, yyyy')}
                          </span>
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
                              onClick={() => copyLink(token.token)}
                            >
                              {copiedId === token.token ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy Link</TooltipContent>
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
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open Link</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onDeleteToken(token.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Link</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
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
