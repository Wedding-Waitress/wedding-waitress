import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { DashboardSidebar } from "@/components/Dashboard/DashboardSidebar";
import { MyEventsPage } from "@/components/Dashboard/MyEventsPage";
import { GuestListTable } from "@/components/Dashboard/GuestListTable";
import { CreateTableModal } from "@/components/Dashboard/CreateTableModal";
import { TableCard } from "@/components/Dashboard/TableCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Users, 
  MapPin, 
  QrCode, 
  Mail,
  Heart,
  Settings,
  TrendingUp,
  Plus,
  Copy,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap
} from "lucide-react";
import QRCodeLib from 'qrcode';
import QrScanner from 'qr-scanner';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useProfile } from '@/hooks/useProfile';
import { useQrPresets } from '@/hooks/useQrPresets';
import { useToast } from '@/hooks/use-toast';

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // QR Code state variables
  const [qrSelectedEventId, setQrSelectedEventId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');
  const [qrForegroundColor, setQrForegroundColor] = useState('#000000');
  const [qrBackgroundColor, setQrBackgroundColor] = useState('#ffffff');
  const [qrModuleShape, setQrModuleShape] = useState<'square' | 'round'>('square');
  const [qrFinderStyle, setQrFinderStyle] = useState<'standard' | 'rounded'>('standard');
  const [qrFrameEnabled, setQrFrameEnabled] = useState(false);
  const [qrFrameStyle, setQrFrameStyle] = useState<'rounded' | 'square'>('rounded');
  const [qrFrameColor, setQrFrameColor] = useState('#000000');
  const [qrLabelText, setQrLabelText] = useState('');
  const [qrLogoFile, setQrLogoFile] = useState<File | null>(null);
  const [qrLogoDataUrl, setQrLogoDataUrl] = useState<string>('');
  const [qrLogoMask, setQrLogoMask] = useState<'square' | 'round'>('round');
  const [qrLogoSize, setQrLogoSize] = useState<number>(15);
  const [qrBgImageFile, setQrBgImageFile] = useState<File | null>(null);
  const [qrBgImageDataUrl, setQrBgImageDataUrl] = useState<string>('');
  const [qrBgOpacity, setQrBgOpacity] = useState<number>(20);
  const [qrBgFitMode, setQrBgFitMode] = useState<'cover' | 'contain' | 'tile'>('cover');
  const [qrBgApplyToLiveView, setQrBgApplyToLiveView] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [scannabilityResults, setScannabilityResults] = useState<{
    small: 'pass' | 'warn' | 'fail' | null;
    medium: 'pass' | 'warn' | 'fail' | null;
    large: 'pass' | 'warn' | 'fail' | null;
  }>({ small: null, medium: null, large: null });
  const [isTestingScannability, setIsTestingScannability] = useState<boolean>(false);

  // AI QR state variables
  const [aiQrSelectedEventId, setAiQrSelectedEventId] = useState<string | null>(null);
  const [aiQrCodeSvg, setAiQrCodeSvg] = useState<string>('');
  const [aiQrTemplate, setAiQrTemplate] = useState<string>('mosaic');
  const [aiQrPhotoFile, setAiQrPhotoFile] = useState<File | null>(null);
  const [aiQrPhotoUrl, setAiQrPhotoUrl] = useState<string>('');
  const [aiQrFocalPoint, setAiQrFocalPoint] = useState<{x: number, y: number}>({x: 50, y: 50});
  const [aiQrPhotoFit, setAiQrPhotoFit] = useState<'cover' | 'contain'>('cover');
  const [aiQrPhotoScrim, setAiQrPhotoScrim] = useState<number>(30);
  const [aiQrModulePattern, setAiQrModulePattern] = useState<'square' | 'round' | 'pixel' | 'dash'>('square');
  const [aiQrEyeStyle, setAiQrEyeStyle] = useState<'standard' | 'rounded' | 'circular' | 'sharp'>('standard');
  const [aiQrModuleColor, setAiQrModuleColor] = useState('#000000');
  const [aiQrBackgroundColor, setAiQrBackgroundColor] = useState('#ffffff');
  const [aiQrEyeColor, setAiQrEyeColor] = useState('#000000');
  const [aiQrLogo, setAiQrLogo] = useState<File | null>(null);
  const [aiQrLogoUrl, setAiQrLogoUrl] = useState<string>('');
  const [aiQrLogoMask, setAiQrLogoMask] = useState<'square' | 'round'>('round');
  const [aiQrLogoSize, setAiQrLogoSize] = useState<number>(15);
  const [aiQrQuietZone, setAiQrQuietZone] = useState<number>(4);
  const [aiQrScannabilityResults, setAiQrScannabilityResults] = useState<{
    small: 'pass' | 'warn' | 'fail' | null;
    medium: 'pass' | 'warn' | 'fail' | null;
    large: 'pass' | 'warn' | 'fail' | null;
  }>({ small: null, medium: null, large: null });
  const [aiQrIsTestingScannability, setAiQrIsTestingScannability] = useState<boolean>(false);

  // Live preview state
  const [previewDevice, setPreviewDevice] = useState<'phone' | 'tablet' | 'desktop'>('phone');
  const [previewOrientation, setPreviewOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'es' | 'fr'>('en');
  const [previewFontSize, setPreviewFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [previewHighContrast, setPreviewHighContrast] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');

  // Preset name state
  const [qrPresetName, setQrPresetName] = useState('');
  const [aiQrPresetName, setAiQrPresetName] = useState('');

  const { events, loading: eventsLoading, refetch: refetchEvents, updateEvent } = useEvents();
  const { profile } = useProfile();
  const { toast } = useToast();

  const selectedEvent = events.find(event => event.id === selectedEventId);
  const selectedQrEvent = events.find(event => event.id === qrSelectedEventId);
  const selectedAiQrEvent = events.find(event => event.id === aiQrSelectedEventId);

  const { tables, loading: tablesLoading, fetchTables, createTable, updateTable, deleteTable } = useTables(selectedEventId);
  const { guests, loading: guestsLoading, moveGuest } = useRealtimeGuests(selectedEventId);
  const qrTables = useTables(qrSelectedEventId).tables;
  const qrGuests = useRealtimeGuests(qrSelectedEventId).guests;

  const { presets: qrPresets, savePreset: saveQrPreset, loadPreset: loadQrPreset, deletePreset: deleteQrPreset } = useQrPresets(qrSelectedEventId);
  const { presets: aiQrPresets, savePreset: saveAiQrPreset, loadPreset: loadAiQrPreset, deletePreset: deleteAiQrPreset } = useQrPresets(aiQrSelectedEventId);

  // Seat finder URLs
  const seatFinderUrl = selectedQrEvent ? `${window.location.origin}/seat-finder/${selectedQrEvent.id}` : '';
  const aiQrSeatFinderUrl = selectedAiQrEvent ? `${window.location.origin}/seat-finder/${selectedAiQrEvent.id}` : '';

  // Live preview guest results
  const previewResults = useMemo(() => {
    if (previewSearch.length < 2) return [];
    
    return qrGuests.filter(guest => {
      const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
      return fullName.includes(previewSearch.toLowerCase());
    }).slice(0, 10);
  }, [previewSearch, qrGuests]);

  // Helper functions and useEffect hooks would be here (omitted for brevity)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <Card className="p-8 text-center">
                <Calendar className="w-16 h-16 mx-auto text-primary mb-4" />
                <CardTitle className="mb-2">My Events</CardTitle>
                <CardDescription className="mb-6">
                  Create and manage your wedding events and celebrations.
                </CardDescription>
                <Button variant="gradient" onClick={() => setActiveTab('my-events')}>
                  <Plus className="w-4 h-4 mr-2" />
                  View Events
                </Button>
              </Card>

              <Card className="p-8 text-center">
                <Users className="w-16 h-16 mx-auto text-primary mb-4" />
                <CardTitle className="mb-2">Guest Management</CardTitle>
                <CardDescription className="mb-6">
                  Organize your guest list and manage invitations with ease.
                </CardDescription>
                <Button variant="gradient" onClick={() => setActiveTab('guest-list')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Guests
                </Button>
              </Card>

              <Card className="p-8 text-center">
                <MapPin className="w-16 h-16 mx-auto text-primary mb-4" />
                <CardTitle className="mb-2">Seating Arrangements</CardTitle>
                <CardDescription className="mb-6">
                  Create beautiful seating charts and table arrangements.
                </CardDescription>
                <Button variant="gradient" onClick={() => setActiveTab('table-list')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tables
                </Button>
              </Card>

              <Card className="p-8 text-center">
                <QrCode className="w-16 h-16 mx-auto text-primary mb-4" />
                <CardTitle className="mb-2">QR Code Generator</CardTitle>
                <CardDescription className="mb-6">
                  Generate beautiful QR codes for easy guest check-in.
                </CardDescription>
                <Button variant="gradient" onClick={() => setActiveTab('qr-code')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate QR
                </Button>
              </Card>

              <Card className="p-8 text-center">
                <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
                <CardTitle className="mb-2">Invitations</CardTitle>
                <CardDescription className="mb-6">
                  Design and send beautiful digital wedding invitations.
                </CardDescription>
                <Button variant="gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invites
                </Button>
              </Card>

              <Card className="p-8 text-center">
                <Heart className="w-16 h-16 mx-auto text-primary mb-4" />
                <CardTitle className="mb-2">Wishing Well</CardTitle>
                <CardDescription className="mb-6">
                  Collect heartfelt messages and wishes from your guests.
                </CardDescription>
                <Button variant="gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Setup Well
                </Button>
              </Card>
            </div>
          </div>
        );

      case 'my-events':
        return <MyEventsPage />;

      case 'guest-list':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={selectedEventId || ""} onValueChange={handleEventSelect}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                </SelectTrigger>
                <SelectContent>
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>{event.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-events" disabled>
                      {eventsLoading ? "Loading events..." : "No events found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent ? (
              <GuestListTable selectedEventId={selectedEvent.id} />
            ) : (
              <CardDescription className="text-center py-8">
                Select an event to view and manage guests
              </CardDescription>
            )}
          </div>
        );

      case 'table-list':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1">
                <label className="text-sm font-medium text-foreground whitespace-nowrap">
                  Choose Event:
                </label>
                <Select value={selectedEventId || ""} onValueChange={handleEventSelect}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.length > 0 ? (
                      events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>{event.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-events" disabled>
                        {eventsLoading ? "Loading events..." : "No events found"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedEvent && (
                <Button onClick={handleCreateTable} variant="gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Table
                </Button>
              )}
            </div>

            {selectedEvent ? (
              <div>
                {tablesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <Card className="p-6">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                          <div className="h-8 bg-muted rounded"></div>
                        </Card>
                      </div>
                    ))}
                  </div>
                ) : tables.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {tables.map((table) => (
                        <TableCard
                          key={table.id}
                          table={table}
                          onEdit={() => handleEditTable(table)}
                          onDelete={deleteTable}
                          guests={guests}
                          eventId={selectedEvent.id}
                          onGuestMove={handleGuestMove}
                        />
                      ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="mb-2">No Tables Created</CardTitle>
                    <CardDescription className="mb-6">
                      Start by creating your first table for {selectedEvent.name}
                    </CardDescription>
                    <Button onClick={handleCreateTable} variant="gradient">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Table
                    </Button>
                  </Card>
                )}
              </div>
            ) : (
              <CardDescription className="text-center py-8">
                Select an event to view and manage tables
              </CardDescription>
            )}
          </div>
        );

      case 'qr-code':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg">QR Code Seating Chart</CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Last synced: {lastSyncTime.toLocaleTimeString()}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    Choose Event:
                  </label>
                  <Select value={qrSelectedEventId || ""} onValueChange={handleQrEventSelect}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {events.length > 0 ? (
                        events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>{event.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-events" disabled>
                          {eventsLoading ? "Loading events..." : "No events found"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedQrEvent ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Seat Finder URL</h4>
                        <div className="p-3 bg-muted rounded-md">
                          <code className="text-xs break-all">{seatFinderUrl}</code>
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        {qrCodeSvg ? (
                          <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                        ) : (
                          <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-md">
                            <span className="text-muted-foreground text-sm">Generating QR...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Apply to Live View Toggle */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Apply background and colors to Live View</label>
                        <p className="text-xs text-muted-foreground">When enabled, QR design will affect the guest experience</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedQrEvent.qr_apply_to_live_view || false}
                        onChange={async (e) => {
                          try {
                            await updateEvent(selectedQrEvent.id, { qr_apply_to_live_view: e.target.checked });
                          } catch (error) {
                            console.error('Error updating live view setting:', error);
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                    </div>

                    {/* Design Presets */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-3">Design Presets</h4>
                      
                      {/* Save Preset */}
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter preset name..."
                            value={qrPresetName}
                            onChange={(e) => setQrPresetName(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (qrPresetName.trim()) {
                                const currentDesign = {
                                  foregroundColor: qrForegroundColor,
                                  backgroundColor: qrBackgroundColor,
                                  moduleShape: qrModuleShape,
                                  finderStyle: qrFinderStyle,
                                  frameEnabled: qrFrameEnabled,
                                  frameStyle: qrFrameStyle,
                                  frameColor: qrFrameColor,
                                  labelText: qrLabelText,
                                  logo: qrLogoDataUrl,
                                  logoMask: qrLogoMask,
                                  logoSize: qrLogoSize,
                                  backgroundImage: qrBgImageDataUrl,
                                  backgroundOpacity: qrBgOpacity,
                                };
                                const success = await saveQrPreset(qrPresetName.trim(), currentDesign);
                                if (success) {
                                  setQrPresetName('');
                                }
                              }
                            }}
                            disabled={!qrPresetName.trim()}
                          >
                            Save Preset
                          </Button>
                        </div>

                        {/* Load Presets */}
                        {qrPresets.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Saved Presets:</p>
                            <div className="flex flex-wrap gap-2">
                              {qrPresets.map((preset) => (
                                <div key={preset.id} className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const design = loadQrPreset(preset);
                                      // Apply loaded design to state
                                      setQrForegroundColor(design.foregroundColor);
                                      setQrBackgroundColor(design.backgroundColor);
                                      setQrModuleShape(design.moduleShape);
                                      setQrFinderStyle(design.finderStyle);
                                      setQrFrameEnabled(design.frameEnabled);
                                      setQrFrameStyle(design.frameStyle);
                                      setQrFrameColor(design.frameColor);
                                      setQrLabelText(design.labelText);
                                      setQrLogoDataUrl(design.logo || '');
                                      setQrLogoMask(design.logoMask);
                                      setQrLogoSize(design.logoSize);
                                      setQrBgImageDataUrl(design.backgroundImage || '');
                                      setQrBgOpacity(design.backgroundOpacity);
                                    }}
                                    className="text-xs"
                                  >
                                    {preset.name}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteQrPreset(preset.id)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center py-4 text-muted-foreground">
                      QR customization features coming soon...
                    </div>
                  </div>
                ) : (
                  <CardDescription className="text-center py-8">
                    Select an event to generate QR code
                  </CardDescription>
                )}
              </div>
            </Card>
            
            <Card className="p-6" data-testid="ai-qr-card">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg">AI / Artistic QR</CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Last synced: {lastSyncTime.toLocaleTimeString()}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    Choose Event:
                  </label>
                  <Select value={aiQrSelectedEventId || ""} onValueChange={handleAiQrEventSelect}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {events.length > 0 ? (
                        events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>{event.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-events" disabled>
                          {eventsLoading ? "Loading events..." : "No events found"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedAiQrEvent ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">AI Artistic QR</h4>
                        <div className="p-3 bg-muted rounded-md">
                          <code className="text-xs break-all">{aiQrSeatFinderUrl}</code>
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        {aiQrCodeSvg ? (
                          <div dangerouslySetInnerHTML={{ __html: aiQrCodeSvg }} />
                        ) : (
                          <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-md">
                            <span className="text-muted-foreground text-sm">Generating AI QR...</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Apply to Live View Toggle */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Apply background and colors to Live View</label>
                        <p className="text-xs text-muted-foreground">When enabled, AI QR design will affect the guest experience</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedAiQrEvent.qr_apply_to_live_view || false}
                        onChange={async (e) => {
                          try {
                            await updateEvent(selectedAiQrEvent.id, { qr_apply_to_live_view: e.target.checked });
                          } catch (error) {
                            console.error('Error updating AI QR live view setting:', error);
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                    </div>

                    {/* Design Presets */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-3">Design Presets</h4>
                      
                      {/* Save Preset */}
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter preset name..."
                            value={aiQrPresetName}
                            onChange={(e) => setAiQrPresetName(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (aiQrPresetName.trim()) {
                                const currentDesign = {
                                  foregroundColor: aiQrModuleColor,
                                  backgroundColor: aiQrBackgroundColor,
                                  moduleShape: aiQrModulePattern as 'square' | 'round',
                                  finderStyle: aiQrEyeStyle as 'standard' | 'rounded',
                                  frameEnabled: false,
                                  frameStyle: 'rounded' as 'rounded' | 'square',
                                  frameColor: '#000000',
                                  labelText: '',
                                  logo: aiQrLogoUrl,
                                  logoMask: aiQrLogoMask,
                                  logoSize: aiQrLogoSize,
                                  backgroundImage: aiQrPhotoUrl,
                                  backgroundOpacity: aiQrPhotoScrim,
                                };
                                const success = await saveAiQrPreset(aiQrPresetName.trim(), currentDesign);
                                if (success) {
                                  setAiQrPresetName('');
                                }
                              }
                            }}
                            disabled={!aiQrPresetName.trim()}
                          >
                            Save Preset
                          </Button>
                        </div>

                        {/* Load Presets */}
                        {aiQrPresets.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Saved Presets:</p>
                            <div className="flex flex-wrap gap-2">
                              {aiQrPresets.map((preset) => (
                                <div key={preset.id} className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const design = loadAiQrPreset(preset);
                                      // Apply loaded design to AI QR state
                                      setAiQrModuleColor(design.foregroundColor);
                                      setAiQrBackgroundColor(design.backgroundColor);
                                      setAiQrModulePattern(design.moduleShape === 'round' ? 'round' : 'square');
                                      setAiQrEyeStyle(design.finderStyle === 'rounded' ? 'rounded' : 'standard');
                                      setAiQrLogoUrl(design.logo || '');
                                      setAiQrLogoMask(design.logoMask);
                                      setAiQrLogoSize(design.logoSize);
                                      setAiQrPhotoUrl(design.backgroundImage || '');
                                      setAiQrPhotoScrim(design.backgroundOpacity);
                                    }}
                                    className="text-xs"
                                  >
                                    {preset.name}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteAiQrPreset(preset.id)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-center py-4 text-muted-foreground">
                      AI QR functionality coming soon...
                    </div>
                  </div>
                ) : (
                  <CardDescription className="text-center py-4">
                    Select an event to create AI artistic QR
                  </CardDescription>
                )}
              </div>
            </Card>
          </div>
        );
      
      case 'planner':
        return (
          <Card className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Wedding Planner</CardTitle>
            <CardDescription className="mb-6">
              Plan and organize every detail of your wedding with our comprehensive planning tools.
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Start Planning
            </Button>
          </Card>
        );
      
      case 'vendor-team':
        return (
          <Card className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Vendor Team</CardTitle>
            <CardDescription className="mb-6">
              Manage your wedding vendor team and coordinate with photographers, caterers, and more.
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendors
            </Button>
          </Card>
        );
      
      case 'account':
        return (
          <Card className="p-8 text-center">
            <Settings className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Account Settings</CardTitle>
            <CardDescription className="mb-6">
              Manage your account preferences, billing information, and profile settings.
            </CardDescription>
            <Button variant="gradient">
              <Settings className="w-4 h-4 mr-2" />
              Update Settings
            </Button>
          </Card>
        );
      
      default:
        return (
          <Card className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Coming Soon</CardTitle>
            <CardDescription>
              This feature is under development. Stay tuned for updates!
            </CardDescription>
          </Card>
        );
    }
  };

  // Helper functions
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleQrEventSelect = (eventId: string) => {
    setQrSelectedEventId(eventId);
  };

  const handleAiQrEventSelect = (eventId: string) => {
    setAiQrSelectedEventId(eventId);
  };

  const handleCreateTable = () => {
    setEditingTable(null);
    setShowCreateTableModal(true);
  };

  const handleEditTable = (table: any) => {
    setEditingTable(table);
    setShowCreateTableModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateTableModal(false);
    setEditingTable(null);
  };

  const handleSaveTable = async (data: { name: string; limit_seats: number; notes?: string; table_no?: number | null }) => {
    if (editingTable) {
      return await updateTable(editingTable.id, data);
    }
    return await createTable(data);
  };

  const handleGuestMove = async (guestId: string, sourceTableId: string | null, destTableId: string, guestName: string) => {
    const destTable = tables.find(t => t.id === destTableId);
    const destTableNo = destTable?.table_no ?? null;
    return await moveGuest({
      guestId,
      sourceTableId,
      destTableId,
      destTableNo,
      guestName,
    });
  };

  // Handle tab changes with refetch for tables page
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Explicitly refetch events when navigating to the Tables page
    if (tabId === 'table-list') {
      refetchEvents();
    }
  };

  const statsData = useMemo(() => {
    const seatsCreated = tables.reduce((sum, table) => sum + (table.limit_seats || 0), 0);
    const seatsFilled = guests.filter(g => g.table_id).length;
    const seatsRemaining = Math.max(seatsCreated - seatsFilled, 0);
    const tablesAtCapacity = tables.filter(t => t.guest_count >= t.limit_seats).length;
    const eventGuestLimit = selectedEvent?.guest_limit ?? 0;
    return {
      tablesCreated: tables.length,
      seatsCreated,
      seatsFilled,
      seatsRemaining,
      eventGuestLimit,
      tablesAtCapacity,
    };
  }, [tables, guests, selectedEvent]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex">
      {/* Sidebar */}
      <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 lg:px-6 px-4 py-6">
          <div className="mx-auto max-w-none">
            {/* Stats Bar for all tabs except My Events */}
            {activeTab !== 'my-events' && <StatsBar stats={statsData} />}
            
            {/* Tab Content */}
            <div className="space-y-6 mt-6">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Create/Edit Table Modal */}
      <CreateTableModal
        isOpen={showCreateTableModal}
        onClose={handleCloseModal}
        onSave={handleSaveTable}
        editingTable={editingTable}
        existingTables={tables}
      />

      {/* Live Preview Modal */}
      {showLivePreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Live Preview - {selectedQrEvent?.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowLivePreview(false)}>
                ×
              </Button>
            </div>
            
            <div className="flex-1 p-4 text-center text-muted-foreground">
              Live Preview functionality coming soon...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
