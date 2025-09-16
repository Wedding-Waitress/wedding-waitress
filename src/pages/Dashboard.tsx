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
  AlertTriangle
} from "lucide-react";
import QRCodeLib from 'qrcode';
import { useEvents } from '@/hooks/useEvents';
import { useTables, TableWithGuestCount } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useRealtimeTables } from '@/hooks/useRealtimeTables';
import { useProfile } from '@/hooks/useProfile';

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithGuestCount | null>(null);
  const [qrSelectedEventId, setQrSelectedEventId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // QR Code design state
  const [qrModuleShape, setQrModuleShape] = useState<'square' | 'round'>('square');
  const [qrForegroundColor, setQrForegroundColor] = useState('#000000');
  const [qrBackgroundColor, setQrBackgroundColor] = useState('#ffffff');
  const [qrFinderStyle, setQrFinderStyle] = useState<'standard' | 'rounded'>('standard');
  const [qrContrastWarning, setQrContrastWarning] = useState<string>('');
  const { 
    events, 
    loading: eventsLoading, 
    activeEventId: eventsActiveEventId, 
    setActiveEventId: setEventsActiveEventId,
    refetch: refetchEvents 
  } = useEvents();
  const { profile } = useProfile();
  const { 
    tables: rawTables, 
    loading: tablesLoading, 
    createTable, 
    updateTable, 
    deleteTable,
    fetchTables
  } = useTables(selectedEventId);
  
  // Real-time guest management
  const { 
    guests, 
    loading: guestsLoading, 
    moveGuest 
  } = useRealtimeGuests(selectedEventId);
  
  // Real-time tables with live guest counts
  const { 
    tables, 
    getGuestsForTable: getRealtimeGuestsForTable 
  } = useRealtimeTables({
    tables: rawTables,
    guests,
    onRefreshTables: fetchTables
  });

  // QR Code cards data hooks
  const { 
    tables: qrTables, 
    loading: qrTablesLoading, 
    fetchTables: fetchQrTables
  } = useTables(qrSelectedEventId);
  
  const { 
    guests: qrGuests, 
    loading: qrGuestsLoading 
  } = useRealtimeGuests(qrSelectedEventId);

  // Get selected event for tables
  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
  
  // Get selected event for My Events countdown (use events active event)
  const selectedCountdownEvent = eventsActiveEventId ? events.find(e => e.id === eventsActiveEventId) : null;

  // Load selected event from localStorage on mount
  useEffect(() => {
    const savedEventId = localStorage.getItem('active_event_id');
    if (savedEventId && events.find(e => e.id === savedEventId)) {
      setSelectedEventId(savedEventId);
    }
  }, [events]);

  // Maintain a stable ref to fetchTables to avoid effect re-installs
  const fetchTablesRef = useRef(fetchTables);
  useEffect(() => {
    fetchTablesRef.current = fetchTables;
  }, [fetchTables]);

  // Listen for custom events from AddGuestModal with debounced refresh
  useEffect(() => {
    let timer: number | null = null;

    const trigger = () => {
      if (!selectedEventId) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fetchTablesRef.current?.();
        timer = null;
      }, 250);
    };

    const handleGuestAdded = () => trigger();
    const handleGuestUpdated = () => trigger();

    window.addEventListener('guest-added', handleGuestAdded);
    window.addEventListener('guest-updated', handleGuestUpdated);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('guest-added', handleGuestAdded);
      window.removeEventListener('guest-updated', handleGuestUpdated);
    };
  }, [selectedEventId]);

  // Handle event selection for tables
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    localStorage.setItem('active_event_id', eventId);
  };

  // Handle event selection for QR cards
  const handleQrEventSelect = (eventId: string) => {
    setQrSelectedEventId(eventId);
    setLastSyncTime(new Date());
  };

  // Get selected QR event
  const selectedQrEvent = qrSelectedEventId ? events.find(e => e.id === qrSelectedEventId) : null;

  // Generate QR code data
  const generateSeatFinderUrl = (event: any) => {
    if (!event) return '';
    const eventSlug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${window.location.origin}/s/${eventSlug}`;
  };

  const seatFinderUrl = selectedQrEvent ? generateSeatFinderUrl(selectedQrEvent) : '';

  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');

  // Check contrast between two colors
  const getContrastRatio = (color1: string, color2: string): number => {
    const getLuminance = (hex: string): number => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = ((rgb >> 16) & 0xff) / 255;
      const g = ((rgb >> 8) & 0xff) / 255;
      const b = (rgb & 0xff) / 255;
      
      const sRGB = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  // Validate contrast and update warning
  useEffect(() => {
    const contrast = getContrastRatio(qrForegroundColor, qrBackgroundColor);
    if (contrast < 3) {
      setQrContrastWarning('Low contrast detected. QR code may not scan properly. Minimum recommended contrast ratio is 3:1.');
    } else {
      setQrContrastWarning('');
    }
  }, [qrForegroundColor, qrBackgroundColor]);

  // Generate QR code SVG
  useEffect(() => {
    if (seatFinderUrl) {
      const qrOptions = {
        type: 'svg' as const,
        errorCorrectionLevel: 'H' as const,
        margin: 4, // Keep 4-module quiet zone
        color: {
          dark: qrForegroundColor,
          light: qrBackgroundColor
        },
        width: 200
      };

      QRCodeLib.toString(seatFinderUrl, qrOptions)
        .then((svg) => {
          let processedSvg = svg;
          
          // Apply module shape modifications if needed
          if (qrModuleShape === 'round') {
            // Convert squares to circles while preserving timing patterns and finders
            processedSvg = processedSvg.replace(
              /<rect[^>]*class="[^"]*"[^>]*>/g,
              (match) => {
                // Skip finder patterns and timing patterns
                if (match.includes('finder') || match.includes('timing')) {
                  return match;
                }
                // Convert regular modules to circles
                const x = match.match(/x="([^"]*)"/)![1];
                const y = match.match(/y="([^"]*)"/)![1];
                const width = match.match(/width="([^"]*)"/)![1];
                const fill = match.match(/fill="([^"]*)"/)![1];
                return `<circle cx="${parseFloat(x) + parseFloat(width) / 2}" cy="${parseFloat(y) + parseFloat(width) / 2}" r="${parseFloat(width) / 2}" fill="${fill}"/>`;
              }
            );
          }
          
          setQrCodeSvg(processedSvg);
        })
        .catch((err) => {
          console.error('QR Code generation error:', err);
        });
    } else {
      setQrCodeSvg('');
    }
  }, [seatFinderUrl, qrForegroundColor, qrBackgroundColor, qrModuleShape, qrFinderStyle]);

  // QR Code action handlers
  const handleCopyLink = async () => {
    if (seatFinderUrl) {
      await navigator.clipboard.writeText(seatFinderUrl);
    }
  };

  const handleDownloadPng = () => {
    if (seatFinderUrl) {
      QRCodeLib.toDataURL(seatFinderUrl, {
        errorCorrectionLevel: 'H',
        margin: 4,
        color: { dark: qrForegroundColor, light: qrBackgroundColor },
        width: 400
      }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `qr-code-${selectedQrEvent?.name || 'event'}.png`;
        link.href = dataUrl;
        link.click();
      });
    }
  };

  const handleDownloadSvg = () => {
    if (qrCodeSvg && selectedQrEvent) {
      const blob = new Blob([qrCodeSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qr-code-${selectedQrEvent.name}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadJpg = () => {
    if (seatFinderUrl) {
      QRCodeLib.toDataURL(seatFinderUrl, {
        errorCorrectionLevel: 'H',
        margin: 4,
        color: { dark: qrForegroundColor, light: qrBackgroundColor },
        width: 400
      }).then((dataUrl) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx!.fillStyle = qrBackgroundColor;
          ctx!.fillRect(0, 0, canvas.width, canvas.height);
          ctx!.drawImage(img, 0, 0);
          const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const link = document.createElement('a');
          link.download = `qr-code-${selectedQrEvent?.name || 'event'}.jpg`;
          link.href = jpgDataUrl;
          link.click();
        };
        img.src = dataUrl;
      });
    }
  };

  const handlePrint = () => {
    if (qrCodeSvg) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>QR Code - ${selectedQrEvent?.name || 'Event'}</title></head>
            <body style="display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h2>${selectedQrEvent?.name || 'Event'} - Seat Finder</h2>
                ${qrCodeSvg}
                <p>${seatFinderUrl}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  // Handle table operations
  const handleCreateTable = () => {
    setEditingTable(null);
    setShowCreateTableModal(true);
  };

  const handleEditTable = (table: TableWithGuestCount) => {
    setEditingTable(table);
    setShowCreateTableModal(true);
  };

  const handleSaveTable = async (data: { name: string; limit_seats: number; notes?: string; table_no?: number | null }) => {
    try {
      if (editingTable) {
        return await updateTable(editingTable.id, data);
      } else {
        return await createTable(data);
      }
    } catch (error) {
      // Error is handled in the modal and hooks
      return false;
    }
  };

  // Calculate real-time statistics - always use selectedEvent for consistency
  const statsData = useMemo(() => {
    // Always use selectedEvent to ensure both Tables and Guest List pages show the same stats
    const currentEvent = selectedEvent;
    
    const tablesCreated = tables.length;
    const seatsCreated = tables.reduce((sum, table) => sum + table.limit_seats, 0);
    const seatsFilled = guests.length;
    const eventGuestLimit = currentEvent?.guest_limit || 0;
    const seatsRemaining = Math.max(0, eventGuestLimit - seatsFilled);
    const tablesAtCapacity = tables.filter(table => table.guest_count >= table.limit_seats).length;

    return {
      tablesCreated,
      seatsCreated,
      seatsFilled,
      seatsRemaining,
      eventGuestLimit,
      tablesAtCapacity
    };
  }, [tables, guests, selectedEvent]);

  // Handle guest movement between tables
  const handleGuestMove = async (
    guestId: string, 
    sourceTableId: string | null, 
    destTableId: string, 
    guestName: string
  ): Promise<boolean> => {
    const destTable = tables.find(t => t.id === destTableId);
    if (!destTable) return false;

    return await moveGuest({
      guestId,
      sourceTableId,
      destTableId,
      destTableNo: destTable.table_no,
      guestName
    });
  };

  const handleCloseModal = () => {
    setShowCreateTableModal(false);
    setEditingTable(null);
  };

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Card className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Dashboard Overview</CardTitle>
            <CardDescription className="mb-6">
              Welcome to your wedding planning dashboard. Get an overview of your event progress.
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </Card>
        );
      
      case 'my-events':
        return <MyEventsPage />;
      
      case 'guest-list':
        return <GuestListTable selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      
      case 'table-list':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
                <div className="space-y-4 flex-1">
                  {/* Event selector */}
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-foreground">
                      Choose Event:
                    </label>
                    <Select value={selectedEventId || ""} onValueChange={handleEventSelect}>
                      <SelectTrigger className="w-[300px]">
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
                  
                  {/* Contextual title - only show if event is selected */}
                  {selectedEvent && (
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-foreground">Table Set Up for</span>
                      <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
                    </div>
                  )}
                </div>
                
                {/* Right side block */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:ml-auto">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-16 h-16 text-primary flex-shrink-0" />
                    <div className="flex flex-col">
                      <CardTitle className="mb-2 text-left">Table Setup</CardTitle>
                      <CardDescription className="text-left">
                        Design your perfect seating arrangement and table layouts
                      </CardDescription>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button 
                            variant="gradient" 
                            className="sm:ml-3 sm:flex-shrink-0"
                            disabled={!selectedEventId}
                            onClick={handleCreateTable}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Tables
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!selectedEventId && (
                        <TooltipContent>
                          <p>Choose Event first</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
            </Card>

            {/* Tables Grid */}
            {selectedEventId && (
              <Card>
                <CardContent className="p-6">
                  {tablesLoading ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">Loading tables...</div>
                    </div>
                   ) : tables.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                       {tables.map((table) => (
                         <TableCard
                           key={table.id}
                           table={table}
                           onEdit={handleEditTable}
                           onDelete={deleteTable}
                           guests={guests}
                           eventId={selectedEventId}
                           onGuestMove={handleGuestMove}
                         />
                       ))}
                     </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">No tables created yet</div>
                      <Button variant="gradient" onClick={handleCreateTable}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Table
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );
      
      case 'floor-plan':
        return (
          <Card className="p-8 text-center">
            <MapPin className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Floor Plan Designer</CardTitle>
            <CardDescription className="mb-6">
              Visualize and design your wedding venue layout
            </CardDescription>
            <Button variant="gradient">
              <Settings className="w-4 h-4 mr-2" />
              Design Floor Plan
            </Button>
          </Card>
        );
      
      case 'rsvp-invite':
        return (
          <Card className="p-8 text-center">
            <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">RSVP Invitations</CardTitle>
            <CardDescription className="mb-6">
              Send beautiful digital invitations and track RSVPs
            </CardDescription>
            <Button variant="gradient">
              <Mail className="w-4 h-4 mr-2" />
              Send Invites
            </Button>
          </Card>
        );
      
      case 'wishing-well':
        return (
          <Card className="p-8 text-center">
            <Heart className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Online Wishing Well</CardTitle>
            <CardDescription className="mb-6">
              Set up your digital gift registry and money collection
            </CardDescription>
            <Button variant="gradient">
              <Heart className="w-4 h-4 mr-2" />
              Setup Wishing Well
            </Button>
          </Card>
        );
      
      case 'qr-code':
        return (
          <div className="space-y-6">
            <Card className="p-8 text-center">
              <QrCode className="w-16 h-16 mx-auto text-primary mb-4" />
              <CardTitle className="mb-2">QR Code Management</CardTitle>
              <CardDescription className="mb-6">
                Generate QR codes for guest check-ins and table assignments
              </CardDescription>
              <Button variant="gradient">
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Codes
              </Button>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          <h4 className="font-medium text-sm">Seat-Finder Link</h4>
                          <div className="p-3 bg-muted rounded-md">
                            <code className="text-xs break-all">{seatFinderUrl}</code>
                          </div>
                          <CardDescription className="text-xs">
                            Tables: {qrTables.length} | Guests: {qrGuests.length}
                          </CardDescription>
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
                      
                      {qrContrastWarning && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{qrContrastWarning}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="design-basics">
                          <AccordionTrigger>Design Basics</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="module-shape">Module Shape</Label>
                                  <Select 
                                    value={qrModuleShape} 
                                    onValueChange={(value: 'square' | 'round') => setQrModuleShape(value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="square">Square</SelectItem>
                                      <SelectItem value="round">Round</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="finder-style">Finder/Eye Style</Label>
                                  <Select 
                                    value={qrFinderStyle} 
                                    onValueChange={(value: 'standard' | 'rounded') => setQrFinderStyle(value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="rounded">Rounded</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="foreground-color">Foreground Color</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id="foreground-color"
                                      type="color"
                                      value={qrForegroundColor}
                                      onChange={(e) => setQrForegroundColor(e.target.value)}
                                      className="w-16 h-8 p-1 rounded border"
                                    />
                                    <Input
                                      type="text"
                                      value={qrForegroundColor}
                                      onChange={(e) => setQrForegroundColor(e.target.value)}
                                      placeholder="#000000"
                                      className="flex-1 font-mono text-sm"
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="background-color">Background Color</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id="background-color"
                                      type="color"
                                      value={qrBackgroundColor}
                                      onChange={(e) => setQrBackgroundColor(e.target.value)}
                                      className="w-16 h-8 p-1 rounded border"
                                    />
                                    <Input
                                      type="text"
                                      value={qrBackgroundColor}
                                      onChange={(e) => setQrBackgroundColor(e.target.value)}
                                      placeholder="#ffffff"
                                      className="flex-1 font-mono text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                <strong>Scannability maintained:</strong> 4-module quiet zone, timing patterns intact, error correction level H
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={handleCopyLink}>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Link
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadPng}>
                          <Download className="w-3 h-3 mr-1" />
                          PNG
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadSvg}>
                          <Download className="w-3 h-3 mr-1" />
                          SVG
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadJpg}>
                          <Download className="w-3 h-3 mr-1" />
                          JPG
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                          <Printer className="w-3 h-3 mr-1" />
                          Print
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <CardDescription className="text-center py-8">
                      Select an event to generate QR code
                    </CardDescription>
                  )}
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-lg">Live View (Preview)</CardTitle>
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
                    <div className="text-center py-4">
                      <CardDescription>
                        {qrTablesLoading || qrGuestsLoading ? 
                          "Loading preview data..." : 
                          `Live preview for ${selectedQrEvent.name}`
                        }
                      </CardDescription>
                    </div>
                  ) : (
                    <CardDescription className="text-center py-4">
                      Select an event to view live preview
                    </CardDescription>
                  )}
                </div>
              </Card>
            </div>
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

  // Handle tab changes with refetch for tables page
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Explicitly refetch events when navigating to the Tables page
    if (tabId === 'table-list') {
      refetchEvents();
    }
  };

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
    </div>
  );
};