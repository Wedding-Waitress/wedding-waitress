import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Copy, Trash2, ChevronDown, ChevronUp, QrCode, Zap, Link2 } from 'lucide-react';
import { useDynamicQRCodes, type DynamicQRCode } from '@/hooks/useDynamicQRCodes';
import { QRAnalyticsDashboard } from './QRAnalyticsDashboard';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { buildDynamicQRUrl } from '@/lib/urlUtils';

export const DynamicQRManager: React.FC = () => {
  const { qrCodes, loading, createQRCode, updateQRCode, deleteQRCode, getScanStats } = useDynamicQRCodes();
  const { events } = useEvents();
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setCreating(true);
    await createQRCode(newLabel.trim());
    setNewLabel('');
    setCreating(false);
  };

  const handleCopyLink = async (code: string) => {
    const url = buildDynamicQRUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!', description: 'Permanent QR link copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const getEventName = (eventId: string | null) => {
    if (!eventId) return 'No event assigned';
    return events.find(e => e.id === eventId)?.name || 'Unknown event';
  };

  if (loading) {
    return (
      <Card className="ww-box">
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading dynamic QR codes...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ww-box">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-medium text-foreground">Dynamic QR Codes</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create permanent QR codes that can be reassigned to different events — never reprint!
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create New */}
        <div className="flex gap-2">
          <Input
            placeholder="Label (e.g. Venue Front Desk)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={creating || !newLabel.trim()} className="gap-1">
            <Plus className="w-4 h-4" /> Create
          </Button>
        </div>

        {/* QR Code List */}
        {qrCodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No dynamic QR codes yet. Create one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {qrCodes.map(qr => (
              <DynamicQRCard
                key={qr.id}
                qr={qr}
                events={events}
                isExpanded={expandedId === qr.id}
                onToggleExpand={() => setExpandedId(expandedId === qr.id ? null : qr.id)}
                onUpdate={updateQRCode}
                onDelete={deleteQRCode}
                onCopyLink={handleCopyLink}
                getScanStats={getScanStats}
                getEventName={getEventName}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface DynamicQRCardProps {
  qr: DynamicQRCode;
  events: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCopyLink: (code: string) => void;
  getScanStats: any;
  getEventName: (id: string | null) => string;
}

const DynamicQRCard: React.FC<DynamicQRCardProps> = ({
  qr, events, isExpanded, onToggleExpand, onUpdate, onDelete, onCopyLink, getScanStats, getEventName,
}) => {
  return (
    <div className={`border rounded-xl p-4 space-y-3 transition-colors ${qr.is_active ? 'border-primary/30 bg-card' : 'border-border bg-muted/30 opacity-70'}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <QrCode className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-foreground truncate">{qr.label}</div>
            <div className="text-xs text-muted-foreground font-mono">/{qr.code}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onCopyLink(qr.code)} title="Copy permanent link">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggleExpand}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Status line */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          qr.is_active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${qr.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
          {qr.is_active ? 'Active' : 'Inactive'}
        </span>
        <span className="text-muted-foreground text-xs">→</span>
        <span className="text-xs text-muted-foreground">{getEventName(qr.current_event_id)}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{qr.destination_type.replace('_', ' ')}</span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Event Assignment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Linked Event</Label>
            <Select
              value={qr.current_event_id || 'none'}
              onValueChange={v => onUpdate(qr.id, { current_event_id: v === 'none' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="none">No event</SelectItem>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Destination</Label>
            <Select
              value={qr.destination_type}
              onValueChange={v => onUpdate(qr.id, { destination_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="guest_lookup">Guest Lookup (Search & RSVP)</SelectItem>
                <SelectItem value="kiosk">Kiosk Mode (Check-in)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Active</Label>
            <Switch
              checked={qr.is_active}
              onCheckedChange={v => onUpdate(qr.id, { is_active: v })}
            />
          </div>

          {/* Permanent Link */}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <code className="text-xs text-foreground break-all flex-1">{buildDynamicQRUrl(qr.code)}</code>
            <Button variant="ghost" size="sm" onClick={() => onCopyLink(qr.code)}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>

          {/* Analytics */}
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-2 text-foreground">Scan Analytics</h4>
            <QRAnalyticsDashboard qrCodeId={qr.id} getScanStats={getScanStats} />
          </div>

          {/* Delete */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(qr.id)}
              className="gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete QR Code
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
