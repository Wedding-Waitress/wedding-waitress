import React, { useState, useEffect } from 'react';
import { Header } from "@/components/Layout/Header";
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { DashboardSidebar } from "@/components/Dashboard/DashboardSidebar";
import { EventsTable } from "@/components/Dashboard/EventsTable";
import { GuestListTable } from "@/components/Dashboard/GuestListTable";
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

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { events } = useEvents();

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
              
              {/* Empty state block - top right on desktop, stacked on mobile */}
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
            <CardContent>
              {/* Empty card body until tables are created */}
            </CardContent>
          </Card>
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
        <Header user={user} onSignOut={handleSignOut} />
        
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
    </div>
  );
};