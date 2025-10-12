import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Plus, BarChart3, Trash2, Copy, Download, QrCode, FolderOpen, Image, Video, MessageSquare, Share2, Facebook, Instagram, Loader2, ChevronDown } from 'lucide-react';
import { SetupWizard } from './SetupWizard';
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
import QRCodeLib from 'qrcode';

export const PhotoVideoSharingPage: React.FC = () => {
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const statsScope = 'all';
  const [showFooter, setShowFooter] = useState(true);
  const [showPublicGallery, setShowPublicGallery] = useState(true);
  const [uploadUrl, setUploadUrl] = useState('');
  const [galleryTitle, setGalleryTitle] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
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
          .select('slug, title, show_footer, show_public_gallery')
          .eq('id', selectedGalleryId)
          .single();

        if ((gallery as any)?.slug) {
          const url = `${window.location.origin}/g/${(gallery as any).slug}`;
          setUploadUrl(url);
          setGalleryTitle((gallery as any).title);
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
                {/* Stats Bar */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Left: Stats Bar - Redesigned 3-Line Layout */}
                  <Card className="ww-box border-2 border-primary/20">
                    <CardContent className="p-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">Statistics</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {/* Stat 1: Galleries Created */}
                        <div className="flex flex-col items-start gap-1">
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                          <p className="text-xs text-muted-foreground">Galleries Created</p>
                          <p className="text-2xl font-bold text-blue-600">{stats.galleriesCount}</p>
                        </div>
                        
                        {/* Stat 2: Photos Added */}
                        <div className="flex flex-col items-start gap-1">
                          <Image className="w-5 h-5 text-green-600" />
                          <p className="text-xs text-muted-foreground">Photos Added</p>
                          <p className="text-2xl font-bold text-green-600">{stats.photosCount}</p>
                        </div>
                        
                        {/* Stat 3: Videos Added */}
                        <div className="flex flex-col items-start gap-1">
                          <Video className="w-5 h-5 text-orange-600" />
                          <p className="text-xs text-muted-foreground">Videos Added</p>
                          <p className="text-2xl font-bold text-orange-600">{stats.videosCount}</p>
                        </div>
                        
                        {/* Stat 4: Guest Book Messages */}
                        <div className="flex flex-col items-start gap-1">
                          <MessageSquare className="w-5 h-5 text-purple-600" />
                          <p className="text-xs text-muted-foreground">Guest Book Messages</p>
                          <p className="text-2xl font-bold text-purple-600">{stats.messagesCount}</p>
                        </div>
                        
                        {/* Stat 5: Total Uploads */}
                        <div className="flex flex-col items-start gap-1">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          <p className="text-xs text-muted-foreground font-semibold">Total Uploads</p>
                          <p className="text-2xl font-bold text-primary">{totalUploads}</p>
                        </div>
                      </div>

                      {/* Separator Line */}
                      {selectedGalleryId && (
                        <>
                          <div className="border-t border-border my-4"></div>

                          {/* Moved: Show Gallery to Guests Toggle */}
                          <div className="flex items-center justify-between">
                            <Label htmlFor="show-public" className="text-sm cursor-pointer">
                              Show gallery to guests tonight
                            </Label>
                            <Switch
                              id="show-public"
                              checked={showPublicGallery}
                              onCheckedChange={(checked) => updateGallerySetting('show_public_gallery', checked)}
                            />
                          </div>

                          {/* Moved: Guest Upload Link */}
                          <div className="space-y-2 mt-3">
                            <Label className="text-xs">Guest Upload Link</Label>
                            <div className="flex gap-2">
                              <Input
                                value={uploadUrl}
                                readOnly
                                className="flex-1 text-xs"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={copyUploadUrl}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

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

                    {/* Export Section */}
                    {selectedGalleryId && (
                      <div className="space-y-3 pt-4 border-t">
                        <Label className="text-sm font-medium">Download All</Label>
                        
                        {!activeExport ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full justify-between"
                              >
                                <span className="flex items-center gap-2">
                                  <Download className="w-4 h-4" />
                                  Download All (ZIP)
                                </span>
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onClick={() => startExport('approved')}>
                                <span className="flex flex-col">
                                  <span className="font-medium">Approved items only</span>
                                  <span className="text-xs text-muted-foreground">Download approved photos & videos</span>
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => startExport('all')}>
                                <span className="flex flex-col">
                                  <span className="font-medium">Everything</span>
                                  <span className="text-xs text-muted-foreground">Including pending items</span>
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">Preparing ZIP...</span>
                            </div>
                            <p className="text-xs text-blue-700">
                              You can keep using the app. We'll update this when it's ready.
                            </p>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          We'll build your ZIP and notify you when it's ready.
                        </p>

                        {/* Recent Exports */}
                        {exports.length > 0 && (
                          <div className="space-y-2 mt-4">
                            <Label className="text-xs font-medium text-muted-foreground">Recent Exports</Label>
                            {exports.slice(0, 3).map((exp) => (
                              <div 
                                key={exp.id} 
                                className="p-2 bg-muted rounded-lg text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    {exp.scope === 'approved' ? 'Approved only' : 'Everything'}
                                  </span>
                                  {exp.status === 'ready' && (
                                    <span className="text-green-600 font-medium">Ready</span>
                                  )}
                                  {exp.status === 'error' && (
                                    <span className="text-red-600 font-medium">Failed</span>
                                  )}
                                </div>
                                
                                <div className="text-muted-foreground">
                                  {format(new Date(exp.created_at), 'MMM d, h:mm a')}
                                  {exp.items_count && ` • ${exp.items_count} items`}
                                  {exp.file_size_bytes && ` • ${(exp.file_size_bytes / 1024 / 1024).toFixed(1)} MB`}
                                </div>
                                
                                {exp.status === 'ready' && exp.download_url && (
                                  <div className="flex gap-2 mt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => window.open(exp.download_url!, '_blank')}
                                      className="flex-1"
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Download
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => {
                                        navigator.clipboard.writeText(exp.download_url!);
                                        toast({
                                          title: 'Copied!',
                                          description: 'Download link copied to clipboard',
                                        });
                                      }}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                                
                                {exp.status === 'error' && exp.error_message && (
                                  <p className="text-red-600 text-xs mt-1">{exp.error_message}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

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
