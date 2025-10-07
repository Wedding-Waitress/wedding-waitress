import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { DashboardSidebar } from "@/components/Dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader";
import { MyEventsPage } from "@/components/Dashboard/MyEventsPage";
import { GuestListTable } from "@/components/Dashboard/GuestListTable";
import { CreateTableModal } from "@/components/Dashboard/CreateTableModal";
import { TableCard } from "@/components/Dashboard/TableCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Users, MapPin, QrCode, Mail, Heart, Settings, TrendingUp, Plus, Printer } from "lucide-react";
import { useEvents } from '@/hooks/useEvents';
import { useTables, TableWithGuestCount } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useRealtimeTables } from '@/hooks/useRealtimeTables';
import { useProfile } from '@/hooks/useProfile';
import { QRCodeSeatingChart } from '@/components/Dashboard/QRCode/QRCodeSeatingChart';
import { QRCodeFeatureGrid } from '@/components/Dashboard/QRCode/QRCodeFeatureGrid';
import { KitchenDietaryChart } from '@/components/Dashboard/QRCode/KitchenDietaryChart';
import { SignagePage } from '@/components/Dashboard/Signage/SignagePage';
import { TableSeatingChartPage as TableSeatingChartPageComponent } from '@/components/Dashboard/TableChart/TableSeatingChartPage';
import { PlaceCardsPage } from '@/components/Dashboard/PlaceCards/PlaceCardsPage';
import { FullSeatingChartPage } from '@/components/Dashboard/FullSeatingChart/FullSeatingChartPage';
import { IndividualTableSeatingChartPage } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import { KioskSetup } from '@/components/Dashboard/Kiosk/KioskSetup';
import { FloorPlanPage } from '@/components/Dashboard/FloorPlan/FloorPlanPage';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithGuestCount | null>(null);
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
  const navigate = useNavigate();
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
    // Filter out placeholder values
    if (eventId === "no-event") {
      return;
    }
    setSelectedEventId(eventId);
    localStorage.setItem('active_event_id', eventId);
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
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
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
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
                <div className="space-y-4 flex-1">
                  {/* Event selector */}
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-foreground">
                      Choose Event:
                    </label>
                    <Select value={selectedEventId || "no-event"} onValueChange={handleEventSelect}>
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                      </SelectTrigger>
                      <SelectContent>
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
                  
                  {/* Contextual title - only show if event is selected */}
                  {selectedEvent && <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-foreground">Table Set Up for</span>
                      <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
                    </div>}
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
                          <Button variant="gradient" className="sm:ml-3 sm:flex-shrink-0" disabled={!selectedEventId} onClick={handleCreateTable}>
                            <Plus className="w-4 h-4 mr-2" />
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

            {/* Tables Grid */}
            {selectedEventId && <Card className="ww-box">
                <CardContent className="p-6">
                  {tablesLoading ? <div className="text-center py-8">
                      <div className="text-muted-foreground">Loading tables...</div>
                    </div> : tables.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                       {tables.map(table => <TableCard key={table.id} table={table} onEdit={handleEditTable} onDelete={deleteTable} guests={guests} eventId={selectedEventId} onGuestMove={handleGuestMove} />)}
                     </div> : <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">No tables created yet</div>
                      <Button variant="gradient" onClick={handleCreateTable}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Table
                      </Button>
                    </div>}
                </CardContent>
              </Card>}
          </div>;
      case 'floor-plan':
        return <FloorPlanPage selectedEventId={selectedEventId} onEventSelect={setSelectedEventId} />;
      case 'rsvp-invite':
        return <Card className="ww-box p-8 text-center">
            <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">RSVP Invitations</CardTitle>
            <CardDescription className="mb-6">
              Send beautiful digital invitations and track RSVPs
            </CardDescription>
            <Button variant="gradient">
              <Mail className="w-4 h-4 mr-2" />
              Send Invites
            </Button>
          </Card>;
      case 'wishing-well':
        return <Card className="ww-box p-8 text-center">
            <Heart className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Online Wishing Well</CardTitle>
            <CardDescription className="mb-6">
              Set up your digital gift registry and money collection
            </CardDescription>
            <Button variant="gradient">
              <Heart className="w-4 h-4 mr-2" />
              Setup Wishing Well
            </Button>
          </Card>;
      case 'signage':
        return <SignagePage selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      case 'qr-code':
        return <QRCodeSeatingChart selectedEventId={selectedEventId} onEventSelect={handleEventSelect} onNavigateToTab={handleTabChange} />;
      case 'printables':
        return selectedEventId ? <QRCodeFeatureGrid eventId={selectedEventId} onNavigateToTab={handleTabChange} /> : <Card className="ww-box p-8 text-center">
            <Printer className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Printables</CardTitle>
            <CardDescription className="mb-6">
              Select an event to view available printable materials
            </CardDescription>
          </Card>;
      case 'kiosk-live-view':
        return <KioskSetup selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      case 'dietary-chart':
        return selectedEventId ? <KitchenDietaryChart eventId={selectedEventId} /> : null;
      case 'table-chart':
        return <div>
            <TableSeatingChartPageComponent selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />
          </div>;
      case 'full-seating-chart':
        return <FullSeatingChartPage selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      case 'place-cards':
        return <PlaceCardsPage />;
      case 'individual-table-chart':
        // Individual table seating chart feature
        return <IndividualTableSeatingChartPage selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      case 'kiosk-setup':
        return <KioskSetup selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      case 'planner':
        return <Card className="ww-box p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Wedding Planner</CardTitle>
            <CardDescription className="mb-6">
              Plan and organize every detail of your wedding with our comprehensive planning tools.
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Start Planning
            </Button>
          </Card>;
      case 'vendor-team':
        return <Card className="ww-box p-8 text-center">
            <Users className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Vendor Team</CardTitle>
            <CardDescription className="mb-6">
              Manage your wedding vendor team and coordinate with photographers, caterers, and more.
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendors
            </Button>
          </Card>;
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
  if (profileLoading || eventsLoading) {
    return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="ww-box p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <CardTitle>Loading Dashboard...</CardTitle>
          <CardDescription>Please wait while we set up your workspace</CardDescription>
        </Card>
      </div>;
  }

  // Show authentication error or redirect to landing
  if (profileError || !profile) {
    return <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="ww-box p-8 text-center max-w-md">
          <CardTitle className="mb-4">Authentication Required</CardTitle>
          <CardDescription className="mb-6">
            You need to be signed in to access the dashboard. Please return to the home page to sign in or create an account.
          </CardDescription>
          <Button variant="gradient" onClick={() => navigate('/')} className="w-full">
            Go to Home Page
          </Button>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-subtle flex">
      {/* Sidebar */}
      <div className="print:hidden">
        <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} onSignOut={handleSignOut} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Universal Header */}
        <DashboardHeader />
        <main className="flex-1 lg:px-6 px-4 py-6">
        <div className="mx-auto max-w-none">
          {/* Stats Bar excluded from: My Events, QR Code, Dashboard, Vendor Team, Planner, Wishing Well, RSVP, Floor Plan, Kiosk Live View, Printables, Place Cards, Dietary Requirements */}
           {activeTab !== 'my-events' && activeTab !== 'qr-code' && activeTab !== 'dashboard' && activeTab !== 'vendor-team' && activeTab !== 'planner' && activeTab !== 'wishing-well' && activeTab !== 'rsvp-invite' && activeTab !== 'floor-plan' && activeTab !== 'kiosk-live-view' && activeTab !== 'printables' && activeTab !== 'individual-table-chart' && activeTab !== 'place-cards' && activeTab !== 'dietary-chart' && <div className="print:hidden">
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
      
      {/* Footer */}
      <footer className="border-t bg-background/95 print:hidden mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Wedding Waitress. All rights reserved.</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a>
              <span>•</span>
              <a href="mailto:support@weddingwaitress.com" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};