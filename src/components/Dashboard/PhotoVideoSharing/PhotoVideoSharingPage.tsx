import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Plus, BarChart3, Trash2, Copy, Download, QrCode, FolderOpen, Image, Video, MessageSquare, Share2, Facebook, Instagram, Loader2, ChevronDown, Eye, Phone } from 'lucide-react';
import { SetupWizard } from './SetupWizard';
import { AlbumViewModal } from './AlbumViewModal';
import { GalleryAnalyticsWidget } from './GalleryAnalyticsWidget';
import { useGalleries } from '@/hooks/useGalleries';
import { useGalleryStats } from '@/hooks/useGalleryStats';
import { useGalleryExports } from '@/hooks/useGalleryExports';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import QRCodeLib from 'qrcode';

export const PhotoVideoSharingPage: React.FC = () => {
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const statsScope = 'all';
  const [showFooter, setShowFooter] = useState(true);
  const [showPublicGallery, setShowPublicGallery] = useState(true);
  const [uploadUrl, setUploadUrl] = useState('');
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryEventDate, setGalleryEventDate] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const { galleries, refetch: refetchGalleries } = useGalleries();
  const { stats } = useGalleryStats(selectedGalleryId, statsScope);
  const { exports, activeExport, startExport } = useGalleryExports(selectedGalleryId);
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

  // Generate upload URL and QR code when album changes
  useEffect(() => {
    if (!selectedGalleryId) {
      setUploadUrl('');
      setGalleryTitle('');
      setGalleryEventDate(null);
      setQrCodeDataUrl('');
      return;
    }

    const generateUrl = async () => {
      try {
        const { data: gallery } = await supabase
          .from('galleries' as any)
          .select('slug, title, event_date, show_footer, show_public_gallery')
          .eq('id', selectedGalleryId)
          .single();

        if ((gallery as any)?.slug) {
          const url = `${window.location.origin}/g/${(gallery as any).slug}`;
          setUploadUrl(url);
          setGalleryTitle((gallery as any).title);
          setGalleryEventDate((gallery as any).event_date);
          setShowFooter((gallery as any).show_footer ?? true);
          setShowPublicGallery((gallery as any).show_public_gallery ?? true);
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
      console.error('Error deleting album:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete album',
        variant: 'destructive',
      });
    }
  };

  const copyUploadUrl = () => {
    navigator.clipboard.writeText(uploadUrl);
    toast({
      title: '✅ Copied!',
      description: 'Guest upload link copied to clipboard',
      className: 'bg-green-50 border-green-200',
    });
  };

  const updateGallerySetting = async (field: 'show_footer' | 'show_public_gallery', value: boolean) => {
    if (!selectedGalleryId) return;

    // Optimistic update
    if (field === 'show_footer') setShowFooter(value);
    if (field === 'show_public_gallery') setShowPublicGallery(value);

    try {
      const { error } = await supabase
        .from('galleries' as any)
        .update({ [field]: value })
        .eq('id', selectedGalleryId);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Gallery settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating gallery setting:', error);
      
      // Revert on error
      if (field === 'show_footer') setShowFooter(!value);
      if (field === 'show_public_gallery') setShowPublicGallery(!value);
      
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        variant: 'destructive',
      });
    }
  };

  const handleWebShare = async () => {
    const shareData = {
      title: galleryTitle,
      text: `Check out our event photos!`,
      url: uploadUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({
          title: 'Shared!',
          description: 'Link shared successfully',
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          copyUploadUrl();
        }
      }
    } else {
      copyUploadUrl();
    }
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(uploadUrl)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const shareToInstagram = () => {
    handleWebShare();
    toast({
      title: 'Instagram Sharing',
      description: 'Instagram doesn\'t allow direct web share. Link copied to clipboard!',
    });
  };

  // Helper function to format filename: EventName-EventDate format
  const formatFilename = (title: string, suffix: string, extension: string): string => {
    // Replace spaces with hyphens, keep special characters like &
    const formattedTitle = title.replace(/\s+/g, '-');
    
    // For album downloads, use EventName-EventDate format (e.g., Jack-&-Jill-29th-November-2025.zip)
    if (suffix === 'Photo-Video-Album' && galleryEventDate) {
      const date = new Date(galleryEventDate);
      const day = format(date, 'd');
      const month = format(date, 'MMMM');
      const year = format(date, 'yyyy');
      
      // Add ordinal suffix (st, nd, rd, th)
      const getOrdinalSuffix = (dayNum: number) => {
        if (dayNum > 3 && dayNum < 21) return 'th';
        switch (dayNum % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };
      
      const dateStr = `${day}${getOrdinalSuffix(parseInt(day))}-${month}-${year}`;
      return `${formattedTitle}-${dateStr}.${extension}`;
    }
    
    // For other downloads (QR codes, etc.), keep existing format
    // Capitalize each word and replace spaces with hyphens
    const capitalizedTitle = title
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-');
    
    const dateStr = galleryEventDate 
      ? format(new Date(galleryEventDate), 'MMM-dd-yyyy')
      : '';
    
    return dateStr 
      ? `${capitalizedTitle}-${suffix}-(${dateStr}).${extension}`
      : `${capitalizedTitle}-${suffix}.${extension}`;
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = formatFilename(galleryTitle, 'Photo-Video-QR', 'png');
    link.href = qrCodeDataUrl;
    link.click();
    
    toast({
      title: 'Success!',
      description: 'QR code downloaded successfully',
    });
  };

  const handleViewGallery = () => {
    if (!selectedGalleryId) return;
    setShowViewModal(true);
  };

  const handleDownloadGallery = async () => {
    if (!selectedGalleryId || isDownloading) return;

    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-gallery-zip', {
        body: {
          galleryId: selectedGalleryId,
          scope: 'approved',
        },
      });

      if (error) throw error;

      toast({
        title: 'Export Started',
        description: 'Your gallery is being prepared. This may take a few moments.',
      });

      // Poll for completion
      const checkExport = async (exportId: string) => {
        const { data: exportData } = await supabase
          .from('gallery_exports')
          .select('status, download_url')
          .eq('id', exportId)
          .single();

        if (exportData?.status === 'ready' && exportData.download_url) {
          const link = document.createElement('a');
          link.href = exportData.download_url;
          link.download = formatFilename(galleryTitle, 'Photo-Video-Album', 'zip');
          link.click();

          toast({
            title: 'Download Ready!',
            description: 'Your gallery ZIP file is downloading now.',
          });
          setIsDownloading(false);
        } else if (exportData?.status === 'error') {
          throw new Error('Export failed');
        } else {
          setTimeout(() => checkExport(exportId), 2000);
        }
      };

      if (data?.export_id) {
        checkExport(data.export_id);
      }
    } catch (error: any) {
      console.error('Error downloading album:', error);
      toast({
        title: 'Error',
        description: 'Failed to download album',
        variant: 'destructive',
      });
      setIsDownloading(false);
    }
  };

  const totalUploads = stats.photosCount + stats.videosCount + stats.messagesCount + stats.audioCount;

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
                <h2 className="text-2xl font-bold">Photo & Video Sharing + Online Guest Book & Audio Guest Book in One!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Let your guests share their favorite moments from your event
                </p>
              </div>
            </div>

            {galleries.length > 0 ? (
              <>
                {/* Stats Bar */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Left: Stats Bar - Redesigned 3-Line Layout */}
                  <Card className="ww-box border-2 border-primary/20">
                    <CardContent className="pt-2 pb-0 px-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-lg font-semibold">Statistics</h3>
                        {galleryTitle && (
                          <p className="text-xl font-medium text-primary">
                            {galleryTitle}
                            {galleryEventDate && ` - ${format(new Date(galleryEventDate), 'EEEE do, MMMM yyyy')}`}
                          </p>
                        )}
                      </div>
                      
                      <Separator className="mb-1.5" />
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Stat 1: Albums Created */}
                        <div className="flex flex-col items-start gap-1 rounded-lg p-3">
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                          <p className="text-xs text-muted-foreground">Albums Created</p>
                          <p className="text-2xl font-bold text-blue-600">{stats.galleriesCount}</p>
                        </div>
                        
                        {/* Stat 2: Photos */}
                        <div className="flex flex-col items-start gap-1">
                          <Image className="w-5 h-5 text-green-600" />
                          <p className="text-xs text-muted-foreground">Photos</p>
                          <p className="text-2xl font-bold text-green-600">{stats.photosCount}</p>
                        </div>
                        
                        {/* Stat 3: Videos */}
                        <div className="flex flex-col items-start gap-1">
                          <Video className="w-5 h-5 text-orange-600" />
                          <p className="text-xs text-muted-foreground">Videos</p>
                          <p className="text-2xl font-bold text-orange-600">{stats.videosCount}</p>
                        </div>
                        
                        {/* Stat 4: Online Guest Book */}
                        <div className="flex flex-col items-start gap-1">
                          <MessageSquare className="w-5 h-5 text-purple-600" />
                          <p className="text-xs text-muted-foreground">Online Guest Book</p>
                          <p className="text-2xl font-bold text-purple-600">{stats.messagesCount}</p>
                        </div>
                        
                        {/* Stat 5: Audio Guestbook */}
                        <div className="flex flex-col items-start gap-1">
                          <Phone className="w-5 h-5 text-pink-600" />
                          <p className="text-xs text-muted-foreground">Audio Guestbook</p>
                          <p className="text-2xl font-bold text-pink-600">{stats.audioCount}</p>
                        </div>
                        
                        {/* Stat 6: Total Uploads */}
                        <div className="flex flex-col items-start gap-1">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          <p className="text-xs text-muted-foreground font-semibold">Total Uploads</p>
                          <p className="text-2xl font-bold text-primary">{totalUploads}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Album Analytics Widget */}
                <GalleryAnalyticsWidget galleryId={selectedGalleryId} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Box 1: Create Album */}
                <Card className="ww-box border-2 border-primary/20">
                  <CardContent className="p-6 space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Create Album</h3>
                      </div>
                      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white border-2 border-primary text-primary text-base font-bold shadow-sm">
                        Step 1
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground flex-grow">
                      Create a new photo & video album for your event
                    </p>
                    <Button
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setShowCreateWizard(true)}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Album
                    </Button>
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      💡 A unique QR/link will be generated for this album. This QR is separate from Seating Chart QRs.
                    </div>
                  </CardContent>
                </Card>

                {/* Box 2: Photo & Video QR Code (only show if gallery selected) */}
                {selectedGalleryId && (
                  <Card className="ww-box border-2 border-primary/20">
                    <CardContent className="p-6 space-y-4 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">Photo & Video QR Code</h3>
                        </div>
                        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white border-2 border-primary text-primary text-base font-bold shadow-sm">
                          Step 2
                        </div>
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

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-3">
                        <Button variant="outline" onClick={copyUploadUrl} disabled={!uploadUrl}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Guest Upload Link
                        </Button>
                        <Button variant="default" onClick={downloadQRCode} disabled={!qrCodeDataUrl}>
                          <Download className="w-4 h-4 mr-2" />
                          QR Code Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Box 3: Select Album & Delete */}
                <Card className="ww-box border-2 border-primary/20">
                  <CardContent className="p-6 space-y-4 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Select Album</h3>
                      </div>
                      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white border-2 border-primary text-primary text-base font-bold shadow-sm">
                        Step 3
                      </div>
                    </div>
                    <div className="space-y-3 flex-grow">
                      <Label className="text-sm">Choose Album</Label>
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

                    <div className="space-y-2">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={handleViewGallery}
                        disabled={!selectedGalleryId}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Album
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleDownloadGallery}
                        disabled={!selectedGalleryId || isDownloading}
                      >
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        {isDownloading ? 'Preparing...' : 'Download Album'}
                      </Button>

                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={!selectedGalleryId}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Album
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
            <AlertDialogTitle>Delete Album?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this album? This action cannot be undone.
              All photos, videos, and guest messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGallery} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Album
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Album View Modal */}
      {selectedGalleryId && (
        <AlbumViewModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          galleryId={selectedGalleryId}
          galleryTitle={galleryTitle}
        />
      )}
    </div>
  );
};
