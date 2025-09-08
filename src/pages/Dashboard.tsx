import React, { useState } from 'react';
import { Header } from "@/components/Layout/Header";
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { NavigationTabs } from "@/components/Dashboard/NavigationTabs";
import { EventsTable } from "@/components/Dashboard/EventsTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/enhanced-card";
import { Button } from "@/components/ui/enhanced-button";
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

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('my-events');
  const [selectedEventId, setSelectedEventId] = useState('3'); // Reema & Hossam's event is selected by default

  // Mock user data
  const user = {
    name: "Naderelalfy1977",
    email: "nader@example.com"
  };

  const handleSignOut = () => {
    // Handle sign out logic
    console.log('Signing out...');
  };

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    console.log('Selected event:', eventId);
  };

  const handleEventEdit = (eventId: string) => {
    console.log('Edit event:', eventId);
  };

  const handleEventDelete = (eventId: string) => {
    console.log('Delete event:', eventId);
  };

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'my-events':
        return (
          <EventsTable
            onEventSelect={handleEventSelect}
            onEventEdit={handleEventEdit}
            onEventDelete={handleEventDelete}
          />
        );
      
      case 'guest-list':
        return (
          <Card variant="elevated" className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Guest List Management</CardTitle>
            <CardDescription className="mb-6">
              Manage your wedding guests, dietary requirements, and seating arrangements
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Add Guests
            </Button>
          </Card>
        );
      
      case 'table-list':
        return (
          <Card variant="elevated" className="p-8 text-center">
            <MapPin className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Table Setup</CardTitle>
            <CardDescription className="mb-6">
              Design your perfect seating arrangement and table layouts
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Create Tables
            </Button>
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
    <div className="min-h-screen bg-gradient-subtle">
      <Header user={user} onSignOut={handleSignOut} />
      
      <main className="container mx-auto px-4 py-6">
        {/* Stats Bar */}
        <StatsBar />
        
        {/* Navigation Tabs */}
        <NavigationTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
        
        {/* Tab Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};