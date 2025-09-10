import React, { useState, useEffect } from 'react';
import { Header } from "@/components/Layout/Header";
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { DashboardSidebar } from "@/components/Dashboard/DashboardSidebar";
import { EventsTable } from "@/components/Dashboard/EventsTable";
import { GuestListTable } from "@/components/Dashboard/GuestListTable";
import { CreateTableModal } from "@/components/Dashboard/CreateTableModal";
import { TableCard } from "@/components/Dashboard/TableCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/enhanced-card";
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
  Calendar, 
  Users, 
  MapPin, 
  QrCode, 
  Mail,
  Heart,
  Settings,
  TrendingUp,
  Plus
} from "lucide-react";
import { useEvents } from '@/hooks/useEvents';
import { useTables, TableWithGuestCount } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useRealtimeTables } from '@/hooks/useRealtimeTables';

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithGuestCount | null>(null);
  const { events } = useEvents();
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

  // Mock user data
  const user = {
    name: "Naderelalfy1977",  
    email: "nader@example.com"
  };

  // Get selected event
  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  // Load selected event from localStorage on mount
  useEffect(() => {
    const savedEventId = localStorage.getItem('active_event_id');
    if (savedEventId && events.find(e => e.id === savedEventId)) {
      setSelectedEventId(savedEventId);
    }
  }, [events]);

  // Handle event selection for tables
  const handleEventSelect = (eventId: string) => {
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

  const handleSignOut = () => {
    // Handle sign out logic
    console.log('Signing out...');
  };

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Card variant="elevated" className="p-8 text-center">
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
        return <EventsTable />;
      
      case 'guest-list':
        return <GuestListTable />;
      
      case 'table-list':
        return (
          <div className="space-y-6">
            <Card variant="elevated">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
                <div className="space-y-4 flex-1">
                  {/* Event selector */}
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-foreground">
                      Choose Event:
                    </label>
                    <Select value={selectedEventId || ""} onValueChange={handleEventSelect}>
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Select an event..." />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>{event.name}</span>
                            </div>
                          </SelectItem>
                        ))}
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
              <Card variant="elevated">
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
          <Card variant="elevated" className="p-8 text-center">
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
          <Card variant="elevated" className="p-8 text-center">
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
          <Card variant="elevated" className="p-8 text-center">
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
          <Card variant="elevated" className="p-8 text-center">
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
        );
      
      case 'planner':
        return (
          <Card variant="elevated" className="p-8 text-center">
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
          <Card variant="elevated" className="p-8 text-center">
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
          <Card variant="elevated" className="p-8 text-center">
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
          <Card variant="elevated" className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Coming Soon</CardTitle>
            <CardDescription>
              This feature is under development. Stay tuned for updates!
            </CardDescription>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex">
      {/* Sidebar */}
      <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header user={user} onSignOut={handleSignOut} hideDashboardElements={true} />
        
        <main className="flex-1 lg:px-6 px-4 py-6">
          <div className="mx-auto max-w-none">
            {/* Stats Bar */}
            <StatsBar />
            
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