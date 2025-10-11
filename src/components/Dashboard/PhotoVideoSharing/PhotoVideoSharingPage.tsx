import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Settings, Image as ImageIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { SetupWizard } from './SetupWizard';
import { PendingUploadsTab } from './PendingUploadsTab';
import { ApprovedGalleryTab } from './ApprovedGalleryTab';
import { GallerySettingsTab } from './GallerySettingsTab';

interface PhotoVideoSharingPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const PhotoVideoSharingPage: React.FC<PhotoVideoSharingPageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const { events, loading: eventsLoading, refetch: refetchEvents } = useEvents();
  const [activeTab, setActiveTab] = useState('pending');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [eventSlug, setEventSlug] = useState('');

  useEffect(() => {
    if (selectedEventId) {
      checkSetupStatus(selectedEventId);
    }
  }, [selectedEventId]);

  const checkSetupStatus = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('setup_completed, slug')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      setNeedsSetup(!data?.setup_completed);
      setEventSlug(data?.slug || '');
    } catch (error) {
      console.error('Error checking setup status:', error);
    }
  };

  const handleSetupComplete = () => {
    setNeedsSetup(false);
    refetchEvents();
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="ww-box">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Camera className="w-12 h-12 text-primary flex-shrink-0" />
            <div>
              <CardTitle className="text-2xl mb-2">Photo & Video Sharing</CardTitle>
              <CardDescription>
                Let your guests share their favorite moments from your event
              </CardDescription>
            </div>
          </div>
          
          {/* Event Selector */}
          <div className="flex flex-col gap-2 min-w-[280px]">
            <label className="text-sm font-medium">Select Event:</label>
            <Select value={selectedEventId || ''} onValueChange={onEventSelect}>
              <SelectTrigger>
                <SelectValue placeholder={eventsLoading ? 'Loading...' : 'Choose an event'} />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      {selectedEventId ? (
        needsSetup ? (
          <SetupWizard 
            eventId={selectedEventId} 
            eventSlug={eventSlug}
            onComplete={handleSetupComplete}
          />
        ) : (
          <Card className="ww-box">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Pending Uploads
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Approved Gallery
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <PendingUploadsTab eventId={selectedEventId} />
              </TabsContent>

              <TabsContent value="approved">
                <ApprovedGalleryTab eventId={selectedEventId} />
              </TabsContent>

              <TabsContent value="settings">
                <GallerySettingsTab eventId={selectedEventId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        )
      ) : (
        <Card className="ww-box p-8 text-center">
          <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please select an event to manage photo & video sharing</p>
        </Card>
      )}
    </div>
  );
};