import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Plus, BarChart3, Trash2, Copy, Download, QrCode, FolderOpen, Image, Video, MessageSquare } from 'lucide-react';
import { SetupWizard } from './SetupWizard';
import { useGalleries } from '@/hooks/useGalleries';
import { useGalleryStats } from '@/hooks/useGalleryStats';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import QRCodeLib from 'qrcode';

export const PhotoVideoSharingPage: React.FC = () => {
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statsScope, setStatsScope] = useState<'all' | 'current'>('current');
  const [uploadUrl, setUploadUrl] = useState('');
  const [galleryTitle, setGalleryTitle] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  const { galleries, refetch: refetchGalleries } = useGalleries();
  const { stats } = useGalleryStats(selectedGalleryId, statsScope);
  const { toast } = useToast();

  useEffect(() => {
    if (galleries.length > 0 && !selectedGalleryId) {
      setSelectedGalleryId(galleries[0].id);
    }
  }, [galleries, selectedGalleryId]);

  // Generate QR code
  const generateQRCode = async (url: string) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 2000;
      
      await QRCodeLib.toCanvas(canvas, url, {
        errorCorrectionLevel: 'H',
        margin: 4,
        width: 2000,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  // Generate upload URL and QR code when gallery changes
  useEffect(() => {
    if (!selectedGalleryId) {
      setUploadUrl('');
      setGalleryTitle('');
      setQrCodeDataUrl('');
      return;
    }

    const generateUrl = async () => {
      try {
        const { data: gallery } = await supabase
          .from('galleries' as any)
          .select('slug, title')
          .eq('id', selectedGalleryId)
          .single();

        if ((gallery as any)?.slug) {
          const url = `${window.location.origin}/g/${(gallery as any).slug}`;
          setUploadUrl(url);
          setGalleryTitle((gallery as any).title);
          await generateQRCode(url);
        }
      } catch (error) {
        console.error('Error generating URL:', error);
      }
    };

    generateUrl();
  }, [selectedGalleryId]);

  const handleWizardComplete = async (galleryId: string) => {
    setShowCreateWizard(false);
    await refetchGalleries();
    setSelectedGalleryId(galleryId);
  };

  const handleDeleteGallery = async () => {
    if (!selectedGalleryId) return;

    try {
      const { error } = await supabase
        .from('galleries' as any)
        .delete()
        .eq('id', selectedGalleryId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Gallery deleted successfully',
      });

      await refetchGalleries();
      setSelectedGalleryId(null);
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Error deleting gallery:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete gallery',
        variant: 'destructive',
      });
    }
  };

  const copyUploadUrl = () => {
    navigator.clipboard.writeText(uploadUrl);
    toast({
      title: 'Copied!',
      description: 'Upload URL copied to clipboard',
    });
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `${galleryTitle.replace(/\s+/g, '-').toLowerCase()}-photo-video-qr.png`;
    link.href = qrCodeDataUrl;
    link.click();
    
    toast({
      title: 'Success!',
      description: 'QR code downloaded successfully',
    });
  };

  const totalUploads = stats.photosCount + stats.videosCount + stats.messagesCount;

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
      {/* Header */}
      <Card className="ww-box">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Title */}
            <div className="flex items-start gap-4">
              <Camera className="w-12 h-12 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold">Photo & Video Sharing</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Let your guests share their favorite moments from your event
                </p>
              </div>
            </div>

            {galleries.length > 0 ? (
              <>
                {/* Stats Summary Bar - Full Width Horizontal */}
                <Card className="ww-box border-2 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Stats displayed horizontally */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-4 lg:gap-6 flex-1">
                        {/* Stat 1: Galleries Created */}
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Galleries Created</p>
                            <p className="text-lg font-bold text-blue-600">{stats.galleriesCount}</p>
                          </div>
                        </div>
                        
                        {/* Stat 2: Photos Added */}
                        <div className="flex items-center gap-2">
                          <Image className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Photos Added</p>
                            <p className="text-lg font-bold text-green-600">{stats.photosCount}</p>
                          </div>
                        </div>
                        
                        {/* Stat 3: Videos Added */}
                        <div className="flex items-center gap-2">
                          <Video className="w-5 h-5 text-orange-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Videos Added</p>
                            <p className="text-lg font-bold text-orange-600">{stats.videosCount}</p>
                          </div>
                        </div>
                        
                        {/* Stat 4: Guest Book Messages */}
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Guest Book Messages</p>
                            <p className="text-lg font-bold text-purple-600">{stats.messagesCount}</p>
                          </div>
                        </div>
                        
                        {/* Stat 5: Total Uploads (highlighted) */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">Total Uploads</p>
                            <p className="text-lg font-bold text-primary">{totalUploads}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right: Scope Selector */}
                      <Select
                        value={statsScope}
                        onValueChange={(value: 'all' | 'current') => setStatsScope(value)}
                      >
                        <SelectTrigger className="w-full md:w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">This Gallery</SelectItem>
                          <SelectItem value="all">All Galleries</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Box 1: Create Gallery */}
                <Card className="ww-box border-2 border-primary/20">
                  <CardContent className="p-6 space-y-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Create Gallery</h3>
                    </div>
                    <p className="text-sm text-muted-foreground flex-grow">
                      Create a new photo & video gallery for your event
                    </p>
                    <Button
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setShowCreateWizard(true)}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Photo & Video Gallery
                    </Button>
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      💡 A unique QR/link will be generated for this gallery. This QR is separate from Seating Chart QRs.
                    </div>
                  </CardContent>
                </Card>

                {/* Box 2: Select Gallery & Delete */}
                <Card className="ww-box border-2 border-primary/20">
                  <CardContent className="p-6 space-y-4 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Select Gallery</h3>
                    </div>
                    <div className="space-y-3 flex-grow">
                      <Label className="text-sm">Choose a gallery:</Label>
                      <Select
                        value={selectedGalleryId || 'no-gallery'}
                        onValueChange={(value) => {
                          if (value !== 'no-gallery') {
                            setSelectedGalleryId(value);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a gallery..." />
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
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={!selectedGalleryId}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Gallery
                    </Button>
                  </CardContent>
                </Card>

                {/* Box 3: Photo & Video QR Code (only show if gallery selected) */}
                {selectedGalleryId && (
                  <Card className="ww-box border-2 border-primary/20">
                    <CardContent className="p-6 space-y-4 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-2">
                        <QrCode className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Photo & Video QR Code</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Share this link or QR code with your guests so they can upload photos and videos
                      </p>
                      
                      {/* QR Code Display */}
                      <div className="flex justify-center bg-white p-4 rounded-lg border flex-grow">
                        {qrCodeDataUrl ? (
                          <img
                            src={qrCodeDataUrl}
                            alt="Gallery QR Code"
                            className="w-full max-w-[250px] h-auto object-contain"
                          />
                        ) : (
                          <div className="w-[250px] h-[250px] flex items-center justify-center bg-muted rounded">
                            <p className="text-sm text-muted-foreground">Generating...</p>
                          </div>
                        )}
                      </div>

                      {/* Guest Upload Link */}
                      <div className="space-y-2">
                        <Label className="text-xs">Guest Upload Link</Label>
                        <div className="flex gap-2">
                          <Input value={uploadUrl} readOnly className="flex-1 text-xs" />
                          <Button variant="outline" size="sm" onClick={copyUploadUrl}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={copyUploadUrl} disabled={!uploadUrl}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button variant="default" onClick={downloadQRCode} disabled={!qrCodeDataUrl}>
                          <Download className="w-4 h-4 mr-2" />
                          Download QR
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              </>
            ) : (
              <div className="text-center py-12">
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this gallery? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGallery} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
