import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { AppSidebar } from "@/components/Dashboard/AppSidebar";
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MyEventsPage } from "@/components/Dashboard/MyEventsPage";
import { GuestListTable } from "@/components/Dashboard/GuestListTable";
import { CreateTableModal } from "@/components/Dashboard/CreateTableModal";
import { TableCard } from "@/components/Dashboard/TableCard";
import { SortableTablesGrid } from "@/components/Dashboard/Tables/SortableTablesGrid";
import { UnassignedGuestsPanel } from "@/components/Dashboard/Tables/UnassignedGuestsPanel";
import { BulkMoveBar } from "@/components/Dashboard/Tables/BulkMoveBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Users, MapPin, QrCode, Mail, Heart, Settings, TrendingUp, Plus, Printer, Undo2 } from "lucide-react";
import { normalizeRsvp } from '@/lib/rsvp';
import { useEvents } from '@/hooks/useEvents';
import { useTables, TableWithGuestCount } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useRealtimeTables } from '@/hooks/useRealtimeTables';
import { useProfile } from '@/hooks/useProfile';
import { useUndoStack } from '@/hooks/useUndoStack';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';

// Lazy-loaded tab pages for faster initial load
const QRCodeSeatingChart = lazy(() => import('@/components/Dashboard/QRCode/QRCodeSeatingChart').then(m => ({ default: m.QRCodeSeatingChart })));
const QRCodeFeatureGrid = lazy(() => import('@/components/Dashboard/QRCode/QRCodeFeatureGrid').then(m => ({ default: m.QRCodeFeatureGrid })));
const KitchenDietaryChart = lazy(() => import('@/components/Dashboard/QRCode/KitchenDietaryChart').then(m => ({ default: m.KitchenDietaryChart })));
const SignagePage = lazy(() => import('@/components/Dashboard/Signage/SignagePage').then(m => ({ default: m.SignagePage })));
const PlaceCardsPage = lazy(() => import('@/components/Dashboard/PlaceCards/PlaceCardsPage').then(m => ({ default: m.PlaceCardsPage })));
const FullSeatingChartPage = lazy(() => import('@/components/Dashboard/FullSeatingChart/FullSeatingChartPage').then(m => ({ default: m.FullSeatingChartPage })));
const IndividualTableSeatingChartPage = lazy(() => import('@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage').then(m => ({ default: m.IndividualTableSeatingChartPage })));
const KioskSetup = lazy(() => import('@/components/Dashboard/Kiosk/KioskSetup').then(m => ({ default: m.KioskSetup })));
const FloorPlanPage = lazy(() => import('@/components/Dashboard/FloorPlan').then(m => ({ default: m.FloorPlanPage })));
const RunningSheetPage = lazy(() => import('@/components/Dashboard/RunningSheet').then(m => ({ default: m.RunningSheetPage })));
const DJMCQuestionnairePage = lazy(() => import('@/components/Dashboard/DJMCQuestionnaire').then(m => ({ default: m.DJMCQuestionnairePage })));
const InvitationsPage = lazy(() => import('@/components/Dashboard/Invitations/InvitationsPage').then(m => ({ default: m.InvitationsPage })));

// Minimal inline spinner for lazy suspense boundaries
const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Feature flags removed — Running Sheet always enabled
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AppErrorBoundary } from '@/components/core/AppErrorBoundary';
import { PlanExpiredModal } from '@/components/Dashboard/PlanExpiredModal';
import { useUserPlan } from '@/hooks/useUserPlan';
import { ExpiryWarningBanner } from '@/components/Dashboard/ExpiryWarningBanner';


export const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState(() => searchParams.get('tab') || 'dashboard');
  
  // Wrap setActiveTab to persist in URL
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [globalSelectedEventId, setGlobalSelectedEventId] = useState<string | null>(null);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithGuestCount | null>(null);
  const navigate = useNavigate();
  const { plan, isTrialExpired, isStarterPlan } = useUserPlan();
  const [showPlanExpired, setShowPlanExpired] = useState(false);

  // Show plan expired modal when trial expires
  useEffect(() => {
    if (isTrialExpired && isStarterPlan) {
      setShowPlanExpired(true);
    }
  }, [isTrialExpired, isStarterPlan]);
  const {
    events,
    loading: eventsLoading,
    activeEventId: eventsActiveEventId,
    setActiveEventId: setEventsActiveEventId,
    refetch: refetchEvents
  } = useEvents();
  const {
    profile,
    loading: profileLoading,
    error: profileError
  } = useProfile();

  // Check session and set up auth listener
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (!session) {
        navigate('/');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    moveGuest,
    reorderGuestsWithSeats,
    refetchGuests
  } = useRealtimeGuests(selectedEventId);

  // Undo stack for guest moves
  const { pushAction, undo, canUndo, lastAction } = useUndoStack();
  const { toast } = useToast();

  // Bulk selection state
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // Real-time tables with live guest counts
  const {
    tables,
    getGuestsForTable: getRealtimeGuestsForTable
  } = useRealtimeTables({
    tables: rawTables,
    guests,
    onRefreshTables: fetchTables
  });

  // Get selected event for tables
  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
  const selectedEventType = selectedEvent?.event_type || 'seated';

  // Get selected event for My Events countdown (use events active event)
  const selectedCountdownEvent = eventsActiveEventId ? events.find(e => e.id === eventsActiveEventId) : null;

  // Load selected event from sessionStorage ONCE on mount (GLOBAL - session-scoped)
  const hasInitialized = useRef(false);
  useEffect(() => {
    // Only initialize once, and only if we have events and haven't set an event yet
    if (hasInitialized.current || events.length === 0 || selectedEventId !== null) {
      return;
    }
    
    const savedEventId = sessionStorage.getItem('ww:session_selected_event');
    if (savedEventId && events.find(e => e.id === savedEventId)) {
      setGlobalSelectedEventId(savedEventId);
      setSelectedEventId(savedEventId);
      hasInitialized.current = true;
    }
  }, [events.length, selectedEventId]);

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

  // Handle GLOBAL event selection (used by all pages)
  const handleGlobalEventSelect = (eventId: string) => {
    if (eventId === "no-event") return;
    setGlobalSelectedEventId(eventId);
    setSelectedEventId(eventId); // Keep backward compatibility
    sessionStorage.setItem('ww:session_selected_event', eventId);
  };
  
  // Legacy handler (for backward compatibility)
  const handleEventSelect = (eventId: string) => {
    handleGlobalEventSelect(eventId);
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
  const handleSaveTable = async (data: {
    name: string;
    limit_seats: number;
    notes?: string;
    table_no?: number | null;
  }) => {
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
    
    // RSVP statistics
    const sentInvites = guests.filter(g =>
      ['email_sent', 'sms_sent', 'both_sent'].includes(g.rsvp_invite_status || 'not_sent')
    ).length;
    const unsentInvites = guests.filter(g =>
      (g.rsvp_invite_status || 'not_sent') === 'not_sent'
    ).length;
    const respondedInvites = guests.filter(g => {
      const normalized = normalizeRsvp(g.rsvp);
      return normalized === "Attending" || normalized === "Not Attending";
    }).length;
    const unrespondedInvites = guests.filter(g => {
      const wasSent = ['email_sent', 'sms_sent', 'both_sent'].includes(g.rsvp_invite_status || 'not_sent');
      const normalized = normalizeRsvp(g.rsvp);
      return wasSent && normalized === "Pending";
    }).length;
    
    return {
      tablesCreated,
      seatsCreated,
      seatsFilled,
      seatsRemaining,
      eventGuestLimit,
      tablesAtCapacity,
      sentInvites,
      unsentInvites,
      respondedInvites,
      unrespondedInvites
    };
  }, [tables, guests, selectedEvent]);

  // Handle guest movement between tables (with optional position)
  const handleGuestMove = async (
    guestId: string, 
    sourceTableId: string | null, 
    destTableId: string | null, 
    guestName: string,
    insertAtIndex?: number
  ): Promise<boolean> => {
    const guest = guests.find(g => g.id === guestId);
    const destTable = destTableId ? tables.find(t => t.id === destTableId) : null;
    
    // Save to undo stack before moving
    if (guest) {
      pushAction({
        guestId,
        guestName,
        previousTableId: sourceTableId,
        previousTableNo: guest.table_no,
        previousSeatNo: guest.seat_no,
        newTableId: destTableId,
      });
    }
    
    return await moveGuest({
      guestId,
      sourceTableId,
      destTableId,
      destTableNo: destTable?.table_no ?? null,
      guestName,
      insertAtIndex
    });
  };

  // Handle undo
  const handleUndo = useCallback(async () => {
    const action = undo();
    if (!action) return;
    
    const prevTable = action.previousTableId ? tables.find(t => t.id === action.previousTableId) : null;
    
    await moveGuest({
      guestId: action.guestId,
      sourceTableId: action.newTableId,
      destTableId: action.previousTableId,
      destTableNo: prevTable?.table_no ?? null,
      guestName: action.guestName,
    });
    
    toast({
      title: "Undo successful",
      description: `Moved ${action.guestName} back`,
    });
  }, [undo, tables, moveGuest, toast]);

  // Ctrl+Z keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && canUndo && activeTab === 'table-list') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, handleUndo, activeTab]);

  // Bulk move handler
  const handleBulkMove = async (destTableId: string | null) => {
    if (selectedGuestIds.size === 0) return;
    setIsBulkMoving(true);
    
    const destTable = destTableId ? tables.find(t => t.id === destTableId) : null;
    let successCount = 0;
    
    for (const guestId of selectedGuestIds) {
      const guest = guests.find(g => g.id === guestId);
      if (!guest) continue;
      
      const success = await moveGuest({
        guestId,
        sourceTableId: guest.table_id,
        destTableId,
        destTableNo: destTable?.table_no ?? null,
        guestName: `${guest.first_name} ${guest.last_name || ''}`.trim(),
      });
      if (success) successCount++;
    }
    
    setSelectedGuestIds(new Set());
    setIsBulkMoving(false);
    
    toast({
      title: "Bulk move complete",
      description: `Moved ${successCount} guest${successCount !== 1 ? 's' : ''}`,
    });
  };

  // Toggle guest selection
  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuestIds(prev => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  // Handle reordering guests within a table
  const handleReorderGuests = async (tableId: string, orderedGuestIds: string[]): Promise<boolean> => {
    return await reorderGuestsWithSeats(tableId, orderedGuestIds);
  };
  const handleCloseModal = () => {
    setShowCreateTableModal(false);
    setEditingTable(null);
  };

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Card className="ww-box p-8 text-center py-[32px] px-[32px] my-0 mx-0">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Dashboard Overview</CardTitle>
            <CardDescription className="mb-6">
              Welcome to your wedding planning dashboard. Get an overview of your event progress.
            </CardDescription>
          </Card>;
      case 'my-events':
        return <MyEventsPage />;
      case 'guest-list':
        return (
          <>
            <SeoHead
              title="Wedding Guest List Manager | Track RSVPs & Guests Easily"
              description="Easily manage your wedding guest list, track RSVPs, organise guests, and send invitations via email or SMS. The simplest way to stay organised for your big day."
              noIndex
            />
            <GuestListTable selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />
          </>
        );
      case 'table-list':
        const tablesSeo = (
          <SeoHead
            title="Tables Planner | Create & Manage Wedding Tables Easily"
            description="Create and manage your wedding or event tables with ease. Add tables, set guest limits, rename tables, and organise seating effortlessly with Wedding Waitress."
            noIndex
          />
        );
        if (selectedEventType === 'cocktail') {
          return (
            <>
              {tablesSeo}
            <Card className="ww-box">
              <CardHeader className="flex flex-col gap-4 pb-6">
                {/* Event Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="text-sm font-medium text-foreground whitespace-nowrap">
                      Choose Event:
                    </label>
                    <Select value={globalSelectedEventId || "no-event"} onValueChange={handleGlobalEventSelect}>
                      <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#967A59]">
                        <SelectValue placeholder="Choose Event" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {events.length > 0 ? events.map(event => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>{event.name}</span>
                            </div>
                          </SelectItem>
                        )) : (
                          <SelectItem value="no-events" disabled>
                            {eventsLoading ? "Loading events..." : "No events found"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-center py-8">
              <CardTitle className="mb-2">Table Management Unavailable For This Event</CardTitle>
              <CardDescription className="text-base">
                This is a cocktail stand-up event. Table creation and seating charts are disabled. You can change this in my events page.
              </CardDescription>
              </CardContent>
            </Card>
            </>
          );
        }
        return <div className="space-y-6">
            {tablesSeo}
            <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
              <CardHeader className="flex flex-col gap-4 pb-6">
                {/* Top row - Title */}
                <div className="flex items-start gap-3">
                  {/* Left: Icon + Title + Description */}
                  <div className="flex items-start gap-3 flex-1">
                    <MapPin className="w-10 h-10 sm:w-16 sm:h-16 text-primary flex-shrink-0" />
                    <div className="flex flex-col">
                      <CardTitle className="mb-2 text-left text-2xl font-bold text-foreground">Table Setup</CardTitle>
                      <div className="text-left text-sm text-muted-foreground">
                        <ul className="list-disc pl-5 space-y-1">
                          <li className="text-red-600 font-bold">Important – Please Read:</li>
                          <li>Design your perfect seating arrangements by adding the number of tables you want to host your guests.</li>
                          <li>We suggest firstly adding a <strong>"Bridal Table"</strong> then the <strong>"1 Groom's Family"</strong> table, then the <strong>"2 Bride's Family"</strong> table.</li>
                          <li>Then add sequential numbering tables like <strong>"1, 2, 3, 4, 5 & etc"</strong></li>
                          <li>Alternatively, have some fun by creating table names like <strong>"Paris, New York, Rome, or Cairo"</strong>.</li>
                          <li>Once you have set up all the table with names or numbers then move onto the next page &gt; <strong>"Guest List"</strong>, to add your guest names & details.</li>
                          <li>Remember, you can always come back here, drag / drop & re-allocate that aunty who still doesn't talk to the other aunts or Uncles ha ha – Have Fun!</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bottom row - Choose Event dropdown and Create Tables button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-foreground whitespace-nowrap">
                      Choose Event:
                    </label>
                    <Select value={globalSelectedEventId || "no-event"} onValueChange={handleGlobalEventSelect}>
                      <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#967A59]">
                        <SelectValue placeholder="Choose Event" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {events.length > 0 ? events.map(event => <SelectItem key={event.id} value={event.id}>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>{event.name}</span>
                              </div>
                            </SelectItem>) : <SelectItem value="no-events" disabled>
                            {eventsLoading ? "Loading events..." : "No events found"}
                          </SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Create Tables Button - Right Side */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="rounded-full flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white" 
                            disabled={!selectedEventId} 
                            onClick={handleCreateTable}
                          >
                            <Plus className="w-4 h-4" />
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
            {selectedEventId && <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
                <CardContent className="p-6">
                  {tablesLoading ? <div className="text-center py-8">
                      <div className="text-muted-foreground">Loading tables...</div>
                    </div> : tables.length > 0 ? (
                      <SortableTablesGrid
                        tables={tables}
                        guests={guests}
                        onMoveGuest={handleGuestMove}
                        onReorderGuests={handleReorderGuests}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {tables.map(table => <TableCard key={table.id} table={table} onEdit={handleEditTable} onDelete={deleteTable} guests={guests} eventId={selectedEventId} />)}
                        </div>
                      </SortableTablesGrid>
                    ) : <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">No tables created yet</div>
                      <Button variant="default" size="xs" className="rounded-full flex items-center gap-2" onClick={handleCreateTable}>
                        <Plus className="w-4 h-4" />
                        Create Your First Table
                      </Button>
                    </div>}
                </CardContent>
              </Card>}
          </div>;
      case 'floor-plan':
        if (selectedEventType === 'cocktail') {
          return (
            <Card className="ww-box p-8 text-center">
              <CardTitle className="mb-2">Floor Plan Unavailable</CardTitle>
              <CardDescription>Floor plan and seating charts are disabled for Cocktail/Stand-up events.</CardDescription>
            </Card>
          );
        }
        return <FloorPlanPage selectedEventId={selectedEventId} onEventSelect={setSelectedEventId} />;
      case 'signage':
        return <SignagePage selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      case 'qr-code':
        return (
          <>
            <SeoHead
              title="QR Code Seating Chart | Digital Wedding Seating Plan"
              description="Create a digital wedding seating chart with a QR code. Guests can scan to instantly find their table. No printing needed — simple, modern, and stress-free."
              noIndex
            />
            <QRCodeSeatingChart selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} onNavigateToTab={handleTabChange} />
          </>
        );
      case 'kiosk-live-view':
        return <KioskSetup selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} />;
      case 'dietary-chart':
        return <KitchenDietaryChart eventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} />;
      case 'full-seating-chart':
        return <FullSeatingChartPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} />;
      case 'place-cards':
        return <PlaceCardsPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} />;
      case 'individual-table-chart':
        // Individual table seating chart feature
        return <IndividualTableSeatingChartPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} />;
      case 'floor-plan':
        return <FloorPlanPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} />;
      case 'running-sheet':
        return <RunningSheetPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} />;
      case 'dj-mc-questionnaire':
        return <DJMCQuestionnairePage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} />;
      case 'invitations':
        return <InvitationsPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} />;
      default:
        return <Card className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Coming Soon</CardTitle>
            <CardDescription>
              This feature is under development. Stay tuned for updates!
            </CardDescription>
          </Card>;
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Handle tab changes with refetch for tables page
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);

    // Explicitly refetch events when navigating to the Tables page
    if (tabId === 'table-list') {
      refetchEvents();
      refetchGuests();
    }
  };

  // Only block on authentication check — data loads in background with cached UI
  if (authLoading) {
    return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="ww-box p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <CardTitle>Loading Dashboard...</CardTitle>
          <CardDescription>Please wait while we set up your workspace</CardDescription>
        </Card>
      </div>;
  }

  // Show authentication error or redirect to landing
  if (!session) {
    return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="ww-box p-8 text-center max-w-md">
          <CardTitle className="mb-4">Authentication Required</CardTitle>
          <CardDescription className="mb-6">
            You need to be signed in to access the dashboard. Please return to the home page to sign in or create an account.
          </CardDescription>
          <Button variant="default" size="xs" className="rounded-full w-full" onClick={() => navigate('/')}>
            Go to Home Page
          </Button>
        </Card>
      </div>;
  }
  return <SidebarProvider>
    <div className="relative min-h-screen bg-gradient-subtle w-full mobile-contain">
      {/* Universal Header - Full Width */}
      <DashboardHeader />
      
      {/* Expiry Warning Banner */}
      <div className="print:hidden">
        <ExpiryWarningBanner />
      </div>
      
      {/* Sidebar and Main Content */}
      <div className="flex pt-16 sm:pt-14 md:pt-16 w-full">
        {/* Sidebar */}
        <div className="print:hidden">
          <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} onSignOut={handleSignOut} />
        </div>
        
        {/* Main Content - Mobile optimized padding */}
        <main className="flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 min-w-0 overflow-x-hidden">
          <div className="w-full max-w-none">
            {/* Stats Bar excluded from: My Events, QR Code, Dashboard, Vendor Team, Planner, Wishing Well, RSVP, Floor Plan, Kiosk Live View, Printables, Place Cards, Dietary Requirements, Full Seating Chart, DJ & MC Questionnaire, Running Sheet, AI Features */}
            {activeTab !== 'my-events' && activeTab !== 'qr-code' && activeTab !== 'dashboard' && activeTab !== 'vendor-team' && activeTab !== 'planner' && activeTab !== 'wishing-well' && activeTab !== 'rsvp-invite' && activeTab !== 'floor-plan' && activeTab !== 'kiosk-live-view' && activeTab !== 'printables' && activeTab !== 'individual-table-chart' && activeTab !== 'place-cards' && activeTab !== 'dietary-chart' && activeTab !== 'full-seating-chart' && activeTab !== 'dj-mc-questionnaire' && activeTab !== 'running-sheet' && activeTab !== 'invitations' && <div className="print:hidden">
              <StatsBar stats={statsData} />
            </div>}
            
            {/* Tab Content */}
            <Suspense fallback={<TabLoader />}>
              <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {renderTabContent()}
              </div>
            </Suspense>
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
        eventGuestLimit={events.find(e => e.id === selectedEventId)?.guest_limit}
        currentEventName={events.find(e => e.id === selectedEventId)?.name}
      />

      {/* Plan Expired Modal */}
      <PlanExpiredModal
        isOpen={showPlanExpired}
        onClose={() => setShowPlanExpired(false)}
        onUpgrade={() => {
          setShowPlanExpired(false);
          toast({
            title: "Upgrade Coming Soon",
            description: "Plan upgrades will be available once Stripe is connected.",
          });
        }}
        trialExtended={plan?.trial_extended ?? false}
      />
    </div>
  </SidebarProvider>;
};