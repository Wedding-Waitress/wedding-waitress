import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Plus, BarChart3 } from 'lucide-react';
import { PendingUploadsTab } from './PendingUploadsTab';
import { ApprovedGalleryTab } from './ApprovedGalleryTab';
import { GallerySettingsTab } from './GallerySettingsTab';
import { SetupWizard } from './SetupWizard';
import { useGalleries } from '@/hooks/useGalleries';
import { useGalleryStats } from '@/hooks/useGalleryStats';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export const PhotoVideoSharingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [statsScope, setStatsScope] = useState<'all' | 'current'>('current');
  
  const { galleries, refetch: refetchGalleries } = useGalleries();
  const { stats } = useGalleryStats(selectedGalleryId, statsScope);

  useEffect(() => {
    if (galleries.length > 0 && !selectedGalleryId) {
      setSelectedGalleryId(galleries[0].id);
    }
  }, [galleries, selectedGalleryId]);

  const handleWizardComplete = async (galleryId: string) => {
    setShowCreateWizard(false);
    await refetchGalleries();
    setSelectedGalleryId(galleryId);
  };

  if (showCreateWizard) {
    return (
      <SetupWizard
        onComplete={handleWizardComplete}
        onCancel={() => setShowCreateWizard(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with two boxes */}
      <Card className="ww-box">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT BOX */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Camera className="w-12 h-12 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold">Photo & Video Sharing</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Let your guests share their favorite moments from your event
                  </p>
                </div>
              </div>
              
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                onClick={() => setShowCreateWizard(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Photo & Video Gallery
              </Button>
              
              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                💡 A unique QR/link will be generated for this gallery. This QR is separate from Seating Chart QRs.
              </div>
            </div>

            {/* RIGHT BOX - STATS */}
            <Card className="border-2 border-primary/20 shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5" />
                    Stats
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Scope:</Label>
                    <Select value={statsScope} onValueChange={(value: 'all' | 'current') => setStatsScope(value)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="current" disabled={!selectedGalleryId}>
                          This Gallery
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <span className="text-xs text-muted-foreground">Galleries Created</span>
                  <span className="text-xl font-bold text-primary">{stats.galleriesCount}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <span className="text-xs text-muted-foreground">Photos Added</span>
                  <span className="text-xl font-bold text-blue-600">{stats.photosCount}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <span className="text-xs text-muted-foreground">Videos Added</span>
                  <span className="text-xl font-bold text-green-600">{stats.videosCount}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <span className="text-xs text-muted-foreground">Messages Added</span>
                  <span className="text-xl font-bold text-orange-600">{stats.messagesCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Selector */}
      {galleries.length > 0 ? (
        <>
          <Card className="ww-box">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium whitespace-nowrap">Select Gallery:</Label>
                <Select value={selectedGalleryId || ''} onValueChange={setSelectedGalleryId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a gallery" />
                  </SelectTrigger>
                  <SelectContent>
                    {galleries.map((gallery) => (
                      <SelectItem key={gallery.id} value={gallery.id}>
                        {gallery.title} {gallery.event_date && `(${format(new Date(gallery.event_date), 'MMM d, yyyy')})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="ww-box">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="pending">Pending Uploads</TabsTrigger>
                  <TabsTrigger value="approved">Approved Gallery</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                {selectedGalleryId && (
                  <>
                    <TabsContent value="pending">
                      <PendingUploadsTab galleryId={selectedGalleryId} />
                    </TabsContent>
                    
                    <TabsContent value="approved">
                      <ApprovedGalleryTab galleryId={selectedGalleryId} />
                    </TabsContent>
                    
                    <TabsContent value="settings">
                      <GallerySettingsTab galleryId={selectedGalleryId} />
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="ww-box">
          <CardContent className="p-12 text-center">
            <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Galleries Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first photo & video gallery to start collecting memories from your event
            </p>
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setShowCreateWizard(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Gallery
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
