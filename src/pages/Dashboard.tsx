import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { AppSidebar } from "@/components/Dashboard/AppSidebar";
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MyEventsPage } from "@/components/Dashboard/MyEventsPage";
import { GuestListTable } from "@/components/Dashboard/GuestListTable";
import { CreateTableModal } from "@/components/Dashboard/CreateTableModal";
import { TableCard } from "@/components/Dashboard/TableCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Users, MapPin, QrCode, Mail, Heart, Settings, TrendingUp, Plus, Printer, Camera } from "lucide-react";
import { normalizeRsvp } from '@/lib/rsvp';
import { useAlbumNavigation } from '@/hooks/useAlbumNavigation';
import { AlbumContentInlineCard } from '@/components/Album/AlbumContentInlineCard';
import { useEvents } from '@/hooks/useEvents';
import { useTables, TableWithGuestCount } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useRealtimeTables } from '@/hooks/useRealtimeTables';
import { useProfile } from '@/hooks/useProfile';
import { QRCodeSeatingChart } from '@/components/Dashboard/QRCode/QRCodeSeatingChart';
import { QRCodeFeatureGrid } from '@/components/Dashboard/QRCode/QRCodeFeatureGrid';
import { KitchenDietaryChart } from '@/components/Dashboard/QRCode/KitchenDietaryChart';
import { SignagePage } from '@/components/Dashboard/Signage/SignagePage';
import { PlaceCardsPage } from '@/components/Dashboard/PlaceCards/PlaceCardsPage';
import { FullSeatingChartPage } from '@/components/Dashboard/FullSeatingChart/FullSeatingChartPage';
import { IndividualTableSeatingChartPage } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import { KioskSetup } from '@/components/Dashboard/Kiosk/KioskSetup';
import { FloorPlanPage } from '@/components/Dashboard/FloorPlan/FloorPlanPage';
import { RunningSheetPage } from '@/components/Dashboard/RunningSheet';
import { flags } from '@/lib/featureFlags';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AppErrorBoundary } from '@/components/core/AppErrorBoundary';

// Lazy load DJ Questionnaire to prevent it from crashing the app
const DJQuestionnaireMain = React.lazy(() => 
  import('@/components/Dashboard/DJQuestionnaire').then(module => ({
    default: module.DJQuestionnaireMain
  }))
);

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [globalSelectedEventId, setGlobalSelectedEventId] = useState<string | null>(null);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithGuestCount | null>(null);
  const navigate = useNavigate();
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

  // Get selected event for tables
  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  // Get selected event for My Events countdown (use events active event)
  const selectedCountdownEvent = eventsActiveEventId ? events.find(e => e.id === eventsActiveEventId) : null;

  // Load selected event from sessionStorage on mount (GLOBAL - session-scoped)
  useEffect(() => {
    const savedEventId = sessionStorage.getItem('ww:session_selected_event');
    if (savedEventId && events.find(e => e.id === savedEventId)) {
      setGlobalSelectedEventId(savedEventId);
      setSelectedEventId(savedEventId); // Keep backward compatibility
    }
  }, [events.length]);

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
    const sentInvites = guests.length; // All guests are considered "sent invites"
    const unsentInvites = Math.max(0, eventGuestLimit - guests.length); // Available slots
    const respondedInvites = guests.filter(g => {
      const normalized = normalizeRsvp(g.rsvp);
      return normalized === "Attending" || normalized === "Not Attending";
    }).length;
    const unrespondedInvites = guests.filter(g => {
      const normalized = normalizeRsvp(g.rsvp);
      return normalized === "Pending";
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

  // Handle guest movement between tables
  const handleGuestMove = async (guestId: string, sourceTableId: string | null, destTableId: string, guestName: string): Promise<boolean> => {
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
        return <Card className="ww-box p-8 text-center py-[32px] px-[32px] my-0 mx-0">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Dashboard Overview</CardTitle>
            <CardDescription className="mb-6">
              Welcome to your wedding planning dashboard. Get an overview of your event progress.
            </CardDescription>
            <Button variant="default" size="xs" className="rounded-full flex items-center gap-2">
              <Plus className="w-4 h-4" />
              View Analytics
            </Button>
          </Card>;
      case 'my-events':
        return <MyEventsPage />;
      case 'guest-list':
        return <GuestListTable selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      case 'table-list':
        return <div className="space-y-6">
            <Card className="ww-box">
              <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6">
                {/* Left side - Title Block */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-16 h-16 text-primary flex-shrink-0" />
                  <div className="flex flex-col">
                    <CardTitle className="mb-2 text-left text-2xl font-medium text-[#7248e6]">Table Setup</CardTitle>
                    <CardDescription className="text-left">
                      Design your perfect seating arrangement and table layouts
                    </CardDescription>
                  </div>
                </div>
                
                {/* Right side - Controls Block */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:ml-auto">
                  {/* Event selector */}
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-foreground whitespace-nowrap">
                      Choose Event:
                    </label>
                    <Select value={globalSelectedEventId || "no-event"} onValueChange={handleGlobalEventSelect}>
                      <SelectTrigger className="w-[300px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#7248E6]">
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
                  
                  {/* Create Tables Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button variant="default" size="xs" className="rounded-full flex items-center gap-2 sm:ml-3 sm:flex-shrink-0 bg-green-500 hover:bg-green-600 text-white" disabled={!selectedEventId} onClick={handleCreateTable}>
                            <Plus className="w-4 h-4" />
                            Create Tables
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!selectedEventId && <TooltipContent>
                          <p>Choose Event first</p>
                        </TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
            </Card>

            {/* Tables Grid - Always rendered to prevent jitter */}
            <Card className="ww-box">
                <CardContent className="p-6">
                  {!selectedEventId ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">Please select an event above</div>
                    </div>
                  ) : tablesLoading ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">Loading tables...</div>
                    </div>
                  ) : tables.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {tables.map(table => (
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
                      <Button variant="default" size="xs" className="rounded-full flex items-center gap-2" onClick={handleCreateTable}>
                        <Plus className="w-4 h-4" />
                        Create Your First Table
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>;
      case 'floor-plan':
        return <FloorPlanPage selectedEventId={selectedEventId} onEventSelect={setSelectedEventId} />;
      case 'signage':
        return <SignagePage selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      case 'photo-video-gallery': {
        // No events at all
        if (events.length === 0) {
          return (
            <Card className="ww-box p-8 text-center">
              <Camera className="w-16 h-16 mx-auto text-primary mb-4" />
              <CardTitle className="mb-2">No Events Yet</CardTitle>
              <CardDescription className="mb-6">
                Create your first event to manage a photo and video album.
              </CardDescription>
              <Button variant="default" size="xs" className="rounded-full flex items-center gap-2" onClick={() => handleTabChange('my-events')}>
                <Plus className="w-4 h-4" />
                Create Event
              </Button>
            </Card>
          );
        }
        
        // Main card that contains EVERYTHING
        return (
          <Card className="ww-box">
            <CardContent className="p-6">
              {/* Event selector - always visible */}
              <div className="mb-6 flex items-center space-x-4">
                <label className="text-sm font-medium text-foreground whitespace-nowrap">
                  Choose Event:
                </label>
                <Select
                  value={globalSelectedEventId || "no-event"}
                  onValueChange={(eventId) => {
                    if (eventId === 'no-event') return;
                    handleGlobalEventSelect(eventId);
                  }}
                >
                  <SelectTrigger className="w-[300px] border-primary focus:ring-primary">
                    <SelectValue placeholder="Choose Event" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{event.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Album management content - only shown after selection */}
              {globalSelectedEventId && (
                <AlbumContentInlineCard eventId={globalSelectedEventId} />
              )}
            </CardContent>
          </Card>
        );
      }
      case 'qr-code':
        return <QRCodeSeatingChart selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} onNavigateToTab={handleTabChange} />;
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
      case 'running-sheet':
        return flags.runningSheet ? (
          <RunningSheetPage />
        ) : (
          <Card className="p-8 text-center">
            <CardTitle className="mb-2">Feature Temporarily Disabled</CardTitle>
            <CardDescription>
              Running Sheet is coming soon. Check back later!
            </CardDescription>
          </Card>
        );
      case 'dj-mc-questionnaire':
        return flags.djQuestionnaire ? (
          <AppErrorBoundary fallback={
            <Card className="p-8 text-center">
              <CardTitle className="mb-4">DJ & MC Questionnaire</CardTitle>
              <CardDescription>
                We couldn't load this section. Please try refreshing or contact support if the issue persists.
              </CardDescription>
            </Card>
          }>
            <React.Suspense fallback={<div className="p-8 text-center">Loading DJ Questionnaire...</div>}>
              <DJQuestionnaireMain selectedEventId={selectedEventId} onEventSelect={handleEventSelect} events={events} />
            </React.Suspense>
          </AppErrorBoundary>
        ) : (
          <Card className="p-8 text-center">
            <CardTitle className="mb-2">Feature Disabled</CardTitle>
            <CardDescription>
              DJ Questionnaire is currently disabled. Please contact support.
            </CardDescription>
          </Card>
        );
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
    }
  };

  // Show loading state while checking authentication
  if (authLoading || profileLoading || eventsLoading) {
    return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="ww-box p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <CardTitle>Loading Dashboard...</CardTitle>
          <CardDescription>Please wait while we set up your workspace</CardDescription>
        </Card>
      </div>;
  }

  // Show authentication error or redirect to landing
  if (!session || profileError || !profile) {
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
    <div className="relative min-h-screen bg-gradient-subtle w-full">
      {/* Universal Header - Full Width */}
      <DashboardHeader />
      
      {/* Sidebar and Main Content */}
      <div className="flex pt-20 sm:pt-16 w-full">
        {/* Sidebar */}
        <div className="print:hidden">
          <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} onSignOut={handleSignOut} />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 w-full px-6 sm:px-4 md:px-6 lg:px-8 py-6 min-w-0">
          <div className="w-full max-w-none">
            {/* Stats Bar excluded from: My Events, QR Code, Dashboard, Vendor Team, Planner, Wishing Well, RSVP, Floor Plan, Kiosk Live View, Printables, Place Cards, Dietary Requirements, Full Seating Chart, Photo & Video Gallery, DJ & MC Questionnaire, Running Sheet */}
            {activeTab !== 'my-events' && activeTab !== 'qr-code' && activeTab !== 'dashboard' && activeTab !== 'vendor-team' && activeTab !== 'planner' && activeTab !== 'wishing-well' && activeTab !== 'rsvp-invite' && activeTab !== 'floor-plan' && activeTab !== 'kiosk-live-view' && activeTab !== 'printables' && activeTab !== 'individual-table-chart' && activeTab !== 'place-cards' && activeTab !== 'dietary-chart' && activeTab !== 'full-seating-chart' && activeTab !== 'photo-video-gallery' && activeTab !== 'dj-mc-questionnaire' && activeTab !== 'running-sheet' && <div className="print:hidden">
              <StatsBar stats={statsData} />
            </div>}
            
            {/* Tab Content */}
            <div className="space-y-6 mt-6">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>
      
      {/* Create/Edit Table Modal */}
      <CreateTableModal isOpen={showCreateTableModal} onClose={handleCloseModal} onSave={handleSaveTable} editingTable={editingTable} existingTables={tables} />
    </div>
  </SidebarProvider>;
};