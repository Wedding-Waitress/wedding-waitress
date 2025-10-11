import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Plus, BarChart3, Trash2, Copy, Download, QrCode } from 'lucide-react';
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
            {/* Title and Create Button */}
            <div className="flex items-start justify-between gap-4">
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
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl whitespace-nowrap"
                onClick={() => setShowCreateWizard(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Gallery
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              💡 A unique QR/link will be generated for this gallery. This QR is separate from Seating Chart QRs.
            </div>

            {galleries.length > 0 ? (
              <div className="space-y-6">
                {/* Box 1: Gallery Management */}
                <Card className="ww-box border-2 border-primary/20">
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
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={!selectedGalleryId}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Gallery
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {selectedGalleryId && (
                  <>
                    {/* Box 2: Photo & Video QR Code */}
                    <Card className="ww-box border-2 border-primary/20">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <QrCode className="w-5 h-5" />
                          Photo & Video QR Code
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Download this high-resolution QR code for printing on signage
                        </p>
                        
                        {/* QR Code Display */}
                        <div className="flex justify-center mb-4 bg-white p-4 rounded-lg border">
                          {qrCodeDataUrl ? (
                            <img 
                              src={qrCodeDataUrl} 
                              alt="Photo & Video Gallery QR Code"
                              className="w-full max-w-[300px] h-auto"
                            />
                          ) : (
                            <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded">
                              <p className="text-sm text-muted-foreground">Generating QR code...</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Download Button */}
                        <Button 
                          variant="default" 
                          className="w-full bg-primary hover:bg-primary/90"
                          onClick={downloadQRCode}
                          disabled={!qrCodeDataUrl}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download QR Code
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Box 3: Guest Upload Link & QR Code Combined */}
                    <Card className="ww-box border-2 border-primary/20">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <QrCode className="w-5 h-5" />
                          Guest Upload Link
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Share this link or QR code with your guests so they can upload photos and videos
                        </p>
                        
                        {/* URL Input */}
                        <div className="flex gap-2 mb-4">
                          <Input value={uploadUrl} readOnly className="flex-1" />
                          <Button variant="outline" onClick={copyUploadUrl}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                        </div>

                        {/* QR Code (smaller) */}
                        <div className="flex justify-center mb-4 bg-white p-4 rounded-lg border">
                          {qrCodeDataUrl ? (
                            <img 
                              src={qrCodeDataUrl} 
                              alt="Upload QR Code"
                              className="w-full max-w-[200px] h-auto"
                            />
                          ) : (
                            <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted rounded">
                              <p className="text-sm text-muted-foreground">Generating...</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            variant="outline"
                            onClick={copyUploadUrl}
                            disabled={!uploadUrl}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </Button>
                          <Button 
                            variant="default"
                            onClick={downloadQRCode}
                            disabled={!qrCodeDataUrl}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download QR
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Box 4: Enhanced Stats */}
                    <Card className="ww-box border-2 border-primary/20">
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
                          <span className="text-xs text-muted-foreground">Guest Book Messages</span>
                          <span className="text-xl font-bold text-orange-600">{stats.messagesCount}</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-primary/10 rounded-lg border-2 border-primary/20">
                          <span className="text-xs font-semibold text-primary">Total Uploads</span>
                          <span className="text-xl font-bold text-primary">{totalUploads}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
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
