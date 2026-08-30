import React, { startTransition, useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense, useDeferredValue } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { AppSidebar } from "@/components/Dashboard/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import myEventsStyles from "@/components/Dashboard/MyEventsPage.module.css";
import { DashboardOverview } from "@/components/Dashboard/DashboardOverview";
import dashboardOverviewStyles from "@/components/Dashboard/DashboardOverview.module.css";
import { TableCard } from "@/components/Dashboard/TableCard";
import { SortableTablesGrid } from "@/components/Dashboard/Tables/SortableTablesGrid";
import { UnassignedGuestsPanel } from "@/components/Dashboard/Tables/UnassignedGuestsPanel";
import { BulkMoveBar } from "@/components/Dashboard/Tables/BulkMoveBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Users, MapPin, QrCode, Mail, Heart, Settings, TrendingUp, Plus, Printer, Undo2, TableProperties, CircleAlert, CalendarDays } from "lucide-react";
import { normalizeRsvp } from '@/lib/rsvp';
import { useEvents } from '@/hooks/useEvents';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';
import { useTables, TableWithGuestCount } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useRealtimeTables } from '@/hooks/useRealtimeTables';
import { useUndoStack } from '@/hooks/useUndoStack';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import { DashboardLoadingScreen, getDashboardLoadingAppearance } from '@/components/Dashboard/DashboardLoadingScreen';
import pageSpacingStyles from './DashboardPageSpacing.module.css';
import tablesPageStyles from './TablesPage.module.css';
import qrCodePageStyles from '@/components/Dashboard/QRCode/QRCodeSeatingChart.module.css';
import guestListStyles from '@/components/Dashboard/GuestListTable.module.css';
import signagePageStyles from '@/components/Dashboard/Signage/SignagePage.module.css';
import invitationsPageStyles from '@/components/Dashboard/Invitations/InvitationsPage.module.css';
import placeCardsPageStyles from '@/components/Dashboard/PlaceCards/PlaceCardsPage.module.css';
import individualTableChartStyles from '@/components/Dashboard/IndividualTableChart/IndividualTableChartPage.module.css';
import kitchenDietaryStyles from '@/components/Dashboard/QRCode/KitchenDietaryChartPage.module.css';
import fullSeatingChartStyles from '@/components/Dashboard/FullSeatingChart/FullSeatingChartPage.module.css';
import photoVideoManagementStyles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';

// Lazy-loaded tab pages for faster initial load
const MyEventsPage = lazy(() => import('@/components/Dashboard/MyEventsPage').then(m => ({ default: m.MyEventsPage })));
const GuestListTable = lazy(() => import('@/components/Dashboard/GuestListTable').then(m => ({ default: m.GuestListTable })));
const CreateTableModal = lazy(() => import('@/components/Dashboard/CreateTableModal').then(m => ({ default: m.CreateTableModal })));
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
const PhotoVideoGalleryPage = lazy(() => import('@/components/Dashboard/PhotoVideoGallery').then(m => ({ default: m.PhotoVideoGalleryPage })));
const Account = lazy(() => import('@/pages/Account').then(m => ({ default: m.Account })));
const GalleryUploadFeaturePage = lazy(() => import('@/pages/GalleryUploadFeaturePage').then(m => ({ default: m.GalleryUploadFeaturePage })));
const GalleryViewFeaturePage = lazy(() => import('@/pages/GalleryViewFeaturePage').then(m => ({ default: m.GalleryViewFeaturePage })));
const GalleryPhotoBoothFeaturePage = lazy(() => import('@/pages/GalleryPhotoBoothFeaturePage').then(m => ({ default: m.GalleryPhotoBoothFeaturePage })));
const GalleryTextGuestbookFeaturePage = lazy(() => import('@/pages/GalleryTextGuestbookFeaturePage').then(m => ({ default: m.GalleryTextGuestbookFeaturePage })));
const GallerySlideshowFeaturePage = lazy(() => import('@/pages/GallerySlideshowFeaturePage').then(m => ({ default: m.GallerySlideshowFeaturePage })));

// Feature flags removed — Running Sheet always enabled
import { supabase } from '@/integrations/supabase/client';
import { AppErrorBoundary } from '@/components/core/AppErrorBoundary';
import { PlanExpiredModal } from '@/components/Dashboard/PlanExpiredModal';
import { useUserPlan } from '@/hooks/useUserPlan';
import { ExpiryWarningBanner } from '@/components/Dashboard/ExpiryWarningBanner';
import { useDashboardSession } from '@/hooks/useDashboardSession';
import { scheduleIdleWork, loadAccountRoute } from '@/lib/authenticatedRoutePreload';
import { preloadDashboardPage, preloadFrequentDashboardPages } from '@/lib/dashboardPagePreload';

/* Organiser pages that use the standardised 1px #472c1d neutral border pass.
   Photo & Video Sharing and its workspaces are intentionally excluded. */
const BROWN_OUTLINE_TABS = new Set([
  'dashboard',
  'my-events',
  'table-list',
  'guest-list',
  'qr-code',
  'signage',
  'invitations',
  'place-cards',
  'individual-table-chart',
  'floor-plan',
  'dietary-chart',
  'full-seating-chart',
  'kiosk-live-view',
  'dj-mc-questionnaire',
  'running-sheet',
]);

/* These redesigned workspaces share one shell-level espresso surface. Keeping the
   background on <main> lets it cover viewport padding and all overflowing content. */
const ESPRESSO_FULL_PAGE_TABS = new Set([
  'signage',
  'invitations',
  'place-cards',
  'individual-table-chart',
  'dietary-chart',
]);

const DashboardPageSkeleton = () => (
  <div
    className="grid min-h-[18rem] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    role="status"
    aria-label="Loading selected dashboard page"
    aria-live="polite"
  >
    {Array.from({ length: 3 }, (_, index) => (
      <div
        key={index}
        className="min-h-40 animate-pulse rounded-2xl border border-[#d8bc91]/25 bg-[#2a160f]/55"
        aria-hidden="true"
      />
    ))}
  </div>
);

export const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isPhotoVideoWorkspace = location.pathname.startsWith('/dashboard/photo-video-gallery/');
  const urlTab = isPhotoVideoWorkspace ? 'photo-video-gallery' : searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTabState] = useState(urlTab);
  // Keep the previous page visible while a cold lazy chunk resolves. Sidebar
  // selection still updates synchronously, so navigation feedback is immediate.
  const renderedTab = useDeferredValue(activeTab);
  
  // Wrap setActiveTab to persist in URL
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    startTransition(() => {
      navigate(`/dashboard?tab=${encodeURIComponent(tab)}`);
    });
  }, [navigate]);

  // Keep activeTab in sync when URL ?tab= changes (header dropdown, back/forward)
  useEffect(() => {
    if (urlTab !== activeTab) setActiveTabState(urlTab);
  }, [urlTab, activeTab]);


  
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithGuestCount | null>(null);
  const {
    session,
    loading: authLoading,
    error: authError,
    retry: retryAuth,
  } = useDashboardSession();
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
    loaded: eventsLoaded,
    activeEventId: eventsActiveEventId,
    setActiveEventId: setEventsActiveEventId,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  // Unified global event selection (single source of truth across all dashboard tabs).
  const {
    selectedEventId,
    selectedEvent,
    status: selectedEventStatus,
    setSelectedEventId,
  } = useSelectedEvent(events, { loading: eventsLoading || !eventsLoaded });
  // Backward-compat aliases — both names now refer to the same value.
  const globalSelectedEventId = selectedEventId;
  const setGlobalSelectedEventId = setSelectedEventId;

  const seatingWorkspaceEventId = renderedTab === 'table-list' || renderedTab === 'guest-list'
    ? selectedEventId
    : null;

  const {
    tables: rawTables,
    loading: tablesLoading,
    createTable,
    updateTable,
    deleteTable,
    fetchTables,
    saveHeadTableSeating,
  } = useTables(seatingWorkspaceEventId);

  // Real-time guest management
  const {
    guests,
    loading: guestsLoading,
    moveGuest,
    updateGuest,
    deleteGuest,
    refetchGuests,
    reorderGuestsWithSeats,
  } = useRealtimeGuests(seatingWorkspaceEventId);

  // Undo stack for guest moves
  const { pushAction, undo, canUndo, lastAction } = useUndoStack();
  const { toast } = useToast();

  // Warm the most frequently used feature chunks after the first dashboard
  // paint. Intent preloading below remains the fast path for every other tab.
  useEffect(() => scheduleIdleWork(() => {
    preloadFrequentDashboardPages();
    void loadAccountRoute();
  }), []);

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

  // Get selected event type (selectedEvent now comes from useSelectedEvent above)
  const selectedEventType = selectedEvent?.event_type || 'seated';

  // Get selected event for My Events countdown (use events active event)
  const selectedCountdownEvent = eventsActiveEventId ? events.find(e => e.id === eventsActiveEventId) : null;

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

  // Handle GLOBAL event selection (used by all pages) — writes through useSelectedEvent.
  const handleGlobalEventSelect = (eventId: string) => {
    if (eventId === "no-event") return;
    setSelectedEventId(eventId);
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
    table_type?: 'round' | 'square' | 'long';
    table_purpose?: 'standard' | 'head';
    head_seating_order?: import('@/lib/headTable').HeadSeatEntry[];
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
    const tablesAtCapacity = tables.filter(table =>
      (table.table_purpose === 'head' ? table.head_seating_order.length : table.guest_count) >= table.limit_seats
    ).length;
    
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
    const sourceTable = sourceTableId ? tables.find(t => t.id === sourceTableId) : null;

    if (destTable?.table_purpose === 'head' || sourceTable?.table_purpose === 'head') {
      toast({
        title: 'Use Arrange Head Table Seating',
        description: 'Head Table assignments and left-to-right order are managed together from the Head Table card.',
        className: 'ww-tables-toast',
      });
      return false;
    }
    
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
      className: 'ww-tables-toast',
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
    if (destTable?.table_purpose === 'head') {
      setIsBulkMoving(false);
      toast({ title: 'Use Arrange Head Table Seating', description: 'Add Head Table guests from its seating arranger.', className: 'ww-tables-toast' });
      return;
    }
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
      className: 'ww-tables-toast',
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
    if (tables.find((table) => table.id === tableId)?.table_purpose === 'head') return false;
    return await reorderGuestsWithSeats(tableId, orderedGuestIds);
  };
  const handleCloseModal = () => {
    setShowCreateTableModal(false);
    setEditingTable(null);
  };

  // Content for different tabs
  const renderTabContent = (tabId: string) => {
    const workspaceSelection = {
      selectedEventId,
      selectedEvent,
      selectionStatus: selectedEventStatus,
    };
    if (isPhotoVideoWorkspace) {
      switch (location.pathname) {
        case '/dashboard/photo-video-gallery/photo-video-sharing':
          return <GalleryUploadFeaturePage {...workspaceSelection} />;
        case '/dashboard/photo-video-gallery/gallery-view':
          return <GalleryViewFeaturePage {...workspaceSelection} />;
        case '/dashboard/photo-video-gallery/digital-photo-booth':
          return <GalleryPhotoBoothFeaturePage {...workspaceSelection} />;
        case '/dashboard/photo-video-gallery/digital-guestbook':
          return <GalleryTextGuestbookFeaturePage {...workspaceSelection} />;
        case '/dashboard/photo-video-gallery/live-slideshow':
          return <GallerySlideshowFeaturePage {...workspaceSelection} />;
        default:
          return <PhotoVideoGalleryPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} eventsLoading={eventsLoading} />;
      }
    }

    switch (tabId) {
      case 'dashboard':
        return (
          <DashboardOverview
            events={events}
            eventsLoading={eventsLoading || !eventsLoaded}
            onNavigateToTab={(tabId, eventId) => {
              if (eventId) setSelectedEventId(eventId);
              handleTabChange(tabId);
            }}
          />
        );
      case 'my-events':
        return <MyEventsPage
          events={events}
          loading={eventsLoading}
          activeEventId={eventsActiveEventId}
          setActiveEventId={setEventsActiveEventId}
          createEvent={createEvent}
          updateEvent={updateEvent}
          deleteEvent={deleteEvent}
        />;
      case 'guest-list':
        return (
          <>
            <SeoHead
              title="Wedding Guest List Manager | Track RSVPs & Guests Easily"
              description="Easily manage your wedding guest list, track RSVPs, organise guests, and send invitations via email or SMS. The simplest way to stay organised for your big day."
              noIndex
            />
            <GuestListTable
              selectedEventId={selectedEventId}
              onEventSelect={handleEventSelect}
              onNavigateToTables={() => setActiveTab('table-list')}
              events={events}
              loading={eventsLoading}
              updateEvent={updateEvent}
              guests={guests}
              guestsLoading={guestsLoading}
              updateGuest={updateGuest}
              deleteGuest={deleteGuest}
              refetchGuests={refetchGuests}
              tables={rawTables}
              tablesLoading={tablesLoading}
              fetchTables={fetchTables}
            />
          </>
        );
      case 'table-list': {
        const tablesSeo = (
          <SeoHead
            title="Tables Planner | Create & Manage Wedding Tables Easily"
            description="Create and manage your wedding or event tables with ease. Add tables, set guest limits, rename tables, and organise seating effortlessly with Wedding Waitress."
            noIndex
          />
        );
        if (selectedEventType === 'cocktail') {
          return (
            <div className={tablesPageStyles.page}>
              {tablesSeo}
            <Card className={`ww-box ${tablesPageStyles.unavailablePanel}`}>
              <CardHeader className="flex flex-col gap-4 pb-6">
                {/* Event Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="text-sm font-medium text-foreground whitespace-nowrap">
                      Choose Event:
                    </label>
                    <Select value={globalSelectedEventId || "no-event"} onValueChange={handleGlobalEventSelect}>
                    <SelectTrigger className={`w-full sm:w-[300px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#967A59] ${tablesPageStyles.eventField}`}>
                        <SelectValue placeholder="Choose Event" />
                      </SelectTrigger>
                      <SelectContent className={`bg-popover border-border z-50 ${tablesPageStyles.eventMenu}`}>
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
            </div>
          );
        }
        return <div className={`space-y-6 ${tablesPageStyles.page}`}>
            {tablesSeo}
            <Card className={`border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] ${tablesPageStyles.setupPanel}`}>
              <CardHeader className="flex flex-col gap-4 pb-6 max-lg:px-4">
                {/* Top row - Title */}
                <div className="flex items-start gap-3">
                  {/* Left: Icon + Title + Description */}
                  <div className="flex items-start gap-3 flex-1 max-lg:flex-col max-lg:gap-2">
                    <TableProperties size={34} strokeWidth={1.8} className={`text-primary flex-shrink-0 ${tablesPageStyles.setupIcon}`} aria-hidden="true" />
                    <div className="flex flex-col max-lg:w-full">
                      <CardTitle className={`mb-2 text-left text-2xl font-bold text-foreground ${tablesPageStyles.sectionHeading}`}>Table Setup</CardTitle>
                      <div className={`text-left text-sm text-muted-foreground ${tablesPageStyles.setupCopy}`}>
                        <ul className="list-disc pl-5 space-y-1 max-lg:pl-4">
                          <li className="text-red-600 font-bold"><span className="inline-flex items-center gap-1.5"><CircleAlert size={17} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />Important – Please Read:</span></li>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 max-lg:items-center">
                  <div className="flex items-center gap-3 max-lg:flex-col max-lg:w-full max-lg:gap-2">
                    <label className="text-sm font-medium text-foreground whitespace-nowrap">
                      Choose Event:
                    </label>
                    <Select value={globalSelectedEventId || "no-event"} onValueChange={handleGlobalEventSelect}>
                      <SelectTrigger className={`w-full sm:w-[300px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#967A59] ${tablesPageStyles.eventField}`}>
                        <SelectValue placeholder="Choose Event" />
                      </SelectTrigger>
                      <SelectContent className={`bg-popover border-border z-50 ${tablesPageStyles.eventMenu}`}>
                        {events.length > 0 ? events.map(event => <SelectItem key={event.id} value={event.id}>
                              <div className="flex items-center gap-[7px]">
                                <CalendarDays size={17} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
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
                        <div className="max-lg:w-full max-lg:flex max-lg:justify-center">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="rounded-full flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white max-lg:h-11 max-lg:px-6" 
                            disabled={!selectedEventId} 
                            onClick={handleCreateTable}
                          >
                            <Plus size={16} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
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
            {selectedEventId && <Card className={`border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] ${tablesPageStyles.tablesPanel}`}>
                <CardContent className="px-6 pb-6 pt-0">
                  <h2 className={tablesPageStyles.tablesHeading}>
                    <TableProperties size={24} strokeWidth={1.8} aria-hidden="true" />
                    Your Event Tables
                  </h2>
                  {tablesLoading ? <div className="text-center py-8">
                      <div className="text-muted-foreground">Loading tables...</div>
                    </div> : tables.length > 0 ? (
                      <SortableTablesGrid
                        tables={tables}
                        guests={guests}
                        onMoveGuest={handleGuestMove}
                        onReorderGuests={handleReorderGuests}
                      >
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {tables.map(table => <TableCard key={table.id} table={table} onEdit={handleEditTable} onDelete={deleteTable} guests={guests} eventId={selectedEventId} participant1={selectedEvent?.partner1_name} participant2={selectedEvent?.partner2_name} onSaveHeadSeating={saveHeadTableSeating} />)}
                          </div>
                      </SortableTablesGrid>
                    ) : <div className={tablesPageStyles.emptyState}>
                      <p className={tablesPageStyles.emptyStateMessage}>No tables created yet</p>
                      <Button
                        variant="default"
                        size="sm"
                        className={`rounded-full inline-flex items-center justify-center gap-2 bg-green-500 text-white ${tablesPageStyles.emptyStateAction}`}
                        onClick={handleCreateTable}
                      >
                        <Plus className="w-5 h-5 text-white" aria-hidden="true" />
                        Create Your First Table
                      </Button>
                    </div>}
                </CardContent>
              </Card>}
          </div>;
      }
      case 'floor-plan':
        if (selectedEventType === 'cocktail') {
          return (
            <Card className="ww-box p-8 text-center">
              <CardTitle className="mb-2">Floor Plan Unavailable</CardTitle>
              <CardDescription>Floor plan and seating charts are disabled for Cocktail/Stand-up events.</CardDescription>
            </Card>
          );
        }
        return <FloorPlanPage selectedEventId={selectedEventId} onEventSelect={setSelectedEventId} events={events} eventsLoading={eventsLoading} />;
      case 'signage':
        return <SignagePage selectedEventId={selectedEventId} onEventSelect={handleEventSelect} events={events} eventsLoading={eventsLoading} />;
      case 'qr-code':
        return (
          <>
            <SeoHead
              title="QR Code Seating Chart | Digital Wedding Seating Plan"
              description="Create a digital wedding seating chart with a QR code. Guests can scan to instantly find their table. No printing needed — simple, modern, and stress-free."
              noIndex
            />
            <QRCodeSeatingChart selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} onNavigateToTab={handleTabChange} events={events} eventsLoading={eventsLoading} />
          </>
        );
      case 'kiosk-live-view':
        return <KioskSetup selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} eventsLoading={eventsLoading} />;
      case 'dietary-chart':
        return <KitchenDietaryChart eventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} />;
      case 'full-seating-chart':
        return <FullSeatingChartPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} eventsLoading={eventsLoading} />;
      case 'place-cards':
        return <PlaceCardsPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} eventsLoading={eventsLoading} />;
      case 'individual-table-chart':
        // Individual table seating chart feature
        return <IndividualTableSeatingChartPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} eventsLoading={eventsLoading} />;
      case 'running-sheet':
        return <RunningSheetPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} />;
      case 'dj-mc-questionnaire':
        return <DJMCQuestionnairePage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} />;
      case 'invitations':
        return <InvitationsPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} eventsLoading={eventsLoading} />;
      case 'photo-video-gallery':
        return <PhotoVideoGalleryPage selectedEventId={globalSelectedEventId} onEventSelect={handleGlobalEventSelect} events={events} eventsLoading={eventsLoading} />;
      case 'account':
        return <Account />;
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

  // Route changes are optimistic; cached/realtime data remains mounted in this shell.
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabIntent = (tabId: string) => {
    void preloadDashboardPage(tabId);
  };

  // Only block on authentication check — data loads in background with cached UI
  if (authLoading) {
    return (
      <DashboardLoadingScreen
        appearance={getDashboardLoadingAppearance('/dashboard', `?tab=${encodeURIComponent(activeTab)}`)}
      />
    );
  }

  if (authError) {
    return (
      <div className="ww-application-background flex min-h-[100dvh] w-full items-center justify-center px-4">
        <Card className="ww-box w-full max-w-md p-8 text-center" role="alert">
          <CardTitle className="mb-2">Dashboard couldn’t load</CardTitle>
          <CardDescription className="mb-6">
            {authError}
          </CardDescription>
          <Button variant="default" size="xs" className="w-full rounded-full" onClick={retryAuth}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // Show authentication error or redirect to landing
  if (!session) {
    return <div className="ww-application-background min-h-screen flex items-center justify-center">
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
    {/* Defensive page-level noIndex — protects every dashboard tab even if a tab forgets its own SeoHead. */}
    <SeoHead
      title="Event Budget Planner | Wedding Waitress"
      description="View your event at a glance and plan, track and manage your event budget."
      noIndex
    />
    <div data-dashboard-shell className={`dashboard-shell ww-application-background relative min-h-screen dashboard-surface w-full mobile-contain ${activeTab === 'my-events' ? 'ww-myevents-brown' : ''}${activeTab === 'running-sheet' ? ' ww-running-sheet-shell' : ''}${activeTab === 'dj-mc-questionnaire' ? ' ww-djmc-shell' : ''}`}>
      {/* Expiry Warning Banner */}
      <div className="print:hidden">
        <ExpiryWarningBanner />
      </div>

      {/* The sidebar is an off-screen sheet below the desktop breakpoint. */}
      <SidebarTrigger
        className="fixed bottom-4 left-4 z-40 h-11 w-11 rounded-full border border-[#967A59]/45 bg-card shadow-lg lg:hidden print:hidden"
        aria-label="Open menu"
        title="Open menu"
      />
      
      {/* Sidebar and Main Content */}
      <div className="flex w-full">
        {/* Sidebar */}
        <div className="print:hidden" data-dashboard-sidebar>
          <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} onTabIntent={handleTabIntent} onSignOut={handleSignOut} />
        </div>
        
        {/* Main Content - Mobile optimized padding */}
        <main data-dashboard-content className={`ww-application-background flex-1 w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 min-w-0 overflow-x-hidden${BROWN_OUTLINE_TABS.has(activeTab) ? ` ${pageSpacingStyles.corePageBottomSpacing}` : ''}${activeTab === 'dashboard' ? ` ${dashboardOverviewStyles.mainSurface}` : ''}${ESPRESSO_FULL_PAGE_TABS.has(activeTab) ? ` ${signagePageStyles.fullPageSurface}` : ''}${activeTab === 'signage' ? ` ${signagePageStyles.signageWorkspaceSurface}` : ''}${activeTab === 'invitations' ? ` ${invitationsPageStyles.invitationsWorkspaceSurface}` : ''}${activeTab === 'place-cards' ? ` ${placeCardsPageStyles.placeCardsWorkspaceSurface}` : ''}${activeTab === 'individual-table-chart' ? ` ${individualTableChartStyles.workspaceSurface}` : ''}${activeTab === 'dietary-chart' ? ` ${kitchenDietaryStyles.dietaryWorkspaceSurface}` : ''}${activeTab === 'full-seating-chart' ? ` ${fullSeatingChartStyles.fullSeatingWorkspaceSurface}` : ''}${isPhotoVideoWorkspace || activeTab === 'photo-video-gallery' ? ` ${photoVideoManagementStyles.photoVideoWorkspaceMain}` : ''}${activeTab === 'my-events' ? ` ${myEventsStyles.mainSurface}` : ''}${activeTab === 'table-list' ? ` ${tablesPageStyles.mainSurface}` : ''}${activeTab === 'guest-list' ? ` ${guestListStyles.mainSurface}` : ''}${activeTab === 'qr-code' ? ` ${qrCodePageStyles.mainSurface}` : ''}${BROWN_OUTLINE_TABS.has(activeTab) ? ' ww-brown-outline-core' : ''}${BROWN_OUTLINE_TABS.has(activeTab) && activeTab !== 'running-sheet' ? ' ww-heading-system' : ''}${BROWN_OUTLINE_TABS.has(activeTab) || activeTab === 'photo-video-gallery' ? ' ww-solid-text' : ''}${activeTab === 'floor-plan' ? ' ww-floorplan-brown' : ''}${activeTab === 'kiosk-live-view' ? ' ww-kiosk-brown' : ''}${activeTab === 'running-sheet' ? ' ww-running-sheet-main' : ''}${activeTab === 'dj-mc-questionnaire' ? ' ww-djmc-main' : ''}`}>
          <div className="w-full max-w-none">
            {/* Stats Bar excluded from: My Events, QR Code, Dashboard, Vendor Team, Planner, Wishing Well, RSVP, Floor Plan, Kiosk Live View, Printables, Place Cards, Dietary Requirements, Full Seating Chart, DJ & MC Questionnaire, Running Sheet, AI Features */}
            {activeTab !== 'my-events' && activeTab !== 'qr-code' && activeTab !== 'dashboard' && activeTab !== 'vendor-team' && activeTab !== 'planner' && activeTab !== 'wishing-well' && activeTab !== 'rsvp-invite' && activeTab !== 'floor-plan' && activeTab !== 'kiosk-live-view' && activeTab !== 'printables' && activeTab !== 'individual-table-chart' && activeTab !== 'place-cards' && activeTab !== 'dietary-chart' && activeTab !== 'full-seating-chart' && activeTab !== 'dj-mc-questionnaire' && activeTab !== 'running-sheet' && activeTab !== 'invitations' && activeTab !== 'signage' && activeTab !== 'account' && activeTab !== 'photo-video-gallery' && <div className={`print:hidden${activeTab === 'table-list' || activeTab === 'guest-list' ? ' ww-tables-stats' : ''}${activeTab === 'table-list' ? ` ${tablesPageStyles.stats}` : ''}${activeTab === 'guest-list' ? ` ${guestListStyles.stats}` : ''}`}>
              {(activeTab === 'table-list' || activeTab === 'guest-list') ? (
                  <StatsBar stats={statsData} />
              ) : (
                <StatsBar stats={statsData} />
              )}
            </div>}
            
            {/* Tab Content */}
            <Suspense
              fallback={<DashboardPageSkeleton />}
            >
              <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {renderTabContent(renderedTab)}
              </div>
            </Suspense>
          </div>
        </main>
      </div>
      
      {/* Create/Edit Table Modal */}
      {showCreateTableModal && (
        <Suspense fallback={null}>
          <CreateTableModal
            isOpen
            onClose={handleCloseModal}
            onSave={handleSaveTable}
            editingTable={editingTable}
            existingTables={tables}
            eventGuestLimit={events.find(e => e.id === selectedEventId)?.guest_limit}
            currentEventName={events.find(e => e.id === selectedEventId)?.name}
            primaryParticipant1={selectedEvent?.partner1_name}
            primaryParticipant2={selectedEvent?.partner2_name}
          />
        </Suspense>
      )}

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
