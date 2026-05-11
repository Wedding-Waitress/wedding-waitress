import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSignageGallery, SignageGalleryImage } from '@/hooks/useSignageGallery';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, ImageIcon, Loader2, Eye, Check, ArrowLeft, Upload, Layers } from 'lucide-react';
import { SignageBulkUploader } from './SignageBulkUploader';

interface SignageGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (imageUrl: string) => void;
}

const prettifyFilename = (filename: string) => {
  const noExt = filename.replace(/\.[^.]+$/, '');
  return noExt.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
};
const randomToken = () => Math.random().toString(36).slice(2, 10);

export const SignageGalleryModal: React.FC<SignageGalleryModalProps> = ({
  open,
  onOpenChange,
  onSelectImage,
}) => {
  const { images, categories, loading, error, refetch } = useSignageGallery();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<SignageGalleryImage | null>(null);

  // Admin upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('bulk');
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || img.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectImage = (image: SignageGalleryImage) => {
    onSelectImage(image.image_url);
    setPreviewImage(null);
    onOpenChange(false);
  };

  const handleUpload = async () => {
    const finalName = uploadName.trim() || (uploadFile ? prettifyFilename(uploadFile.name) : '');
    const finalCategory = uploadCategory.trim() || 'Uncategorized';
    if (!uploadFile) {
      toast({ title: 'Choose an image', description: 'Please select a PNG or JPG file first.', variant: 'destructive' });
      return;
    }
    if (!finalName) {
      toast({ title: 'Name required', description: 'Give the design a name.', variant: 'destructive' });
      return;
    }
    if (uploadFile.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum 50 MB per upload.', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      // 1. Upload original to storage first (no Base64, no request-size limit)
      const ext = (uploadFile.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'png').toLowerCase();
      const sourcePath = `sources/${Date.now()}-${randomToken()}.${ext}`;
      const up = await supabase.storage
        .from('signage-gallery')
        .upload(sourcePath, uploadFile, { contentType: uploadFile.type, upsert: false });
      if (up.error) throw up.error;

      // 2. Optimize + register
      const { data, error: fnErr } = await supabase.functions.invoke('optimize-signage-image', {
        body: { sourcePath, name: finalName, category: finalCategory },
      });
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      const masterKB = Math.round(((data as any)?.masterBytes ?? 0) / 1024);
      const thumbKB = Math.round(((data as any)?.thumbBytes ?? 0) / 1024);
      toast({
        title: 'Uploaded & optimized',
        description: `Print master ${masterKB} KB · thumbnail ${thumbKB} KB`,
      });
      setUploadName('');
      setUploadCategory('');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUpload(false);
      await refetch();
    } catch (err: any) {
      console.error('Signage upload failed', err);
      toast({
        title: 'Upload failed',
        description: err?.message ?? 'Could not optimize and upload the image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { setPreviewImage(null); setShowUpload(false); } onOpenChange(val); }}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col bg-white [&~[data-radix-scroll-area-viewport]]:!border-0" style={{ zIndex: 110 }} overlayClassName="z-[105] bg-black/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 max-sm:flex-col max-sm:items-start max-sm:gap-1">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Seating Chart Sign Image Gallery
            </div>
            <span className="text-primary font-medium">{images.length} Total Designs</span>
            {isAdmin && !previewImage && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto lv-premium-shade"
                onClick={() => setShowUpload((s) => !s)}
              >
                <Upload className="h-4 w-4 mr-1" />
                {showUpload ? 'Close Upload' : 'Admin Upload'}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isAdmin && showUpload && !previewImage && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={uploadMode === 'bulk' ? 'default' : 'outline'}
                onClick={() => setUploadMode('bulk')}
                className="lv-premium-shade"
              >
                <Layers className="h-4 w-4 mr-1" />
                Bulk Upload
              </Button>
              <Button
                size="sm"
                variant={uploadMode === 'single' ? 'default' : 'outline'}
                onClick={() => setUploadMode('single')}
                className="lv-premium-shade"
              >
                <Upload className="h-4 w-4 mr-1" />
                Single Upload
              </Button>
            </div>

            {uploadMode === 'bulk' ? (
              <SignageBulkUploader onAllDone={() => { refetch(); }} />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Design name (e.g. Asian Wedding – Chinese Lantern Floral)"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    disabled={uploading}
                  />
                  <Input
                    placeholder="Category (e.g. Asian Wedding, Floral, Modern)"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    disabled={uploading}
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    disabled={uploading}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !uploadFile || !uploadName.trim() || !uploadCategory.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white lv-premium-shade"
                  >
                    {uploading ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Optimizing…</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-1" />Optimize & Upload</>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-converts PNG → JPG (quality 92, full pixel dimensions for A0 print) and generates an 800px web thumbnail. Max 50 MB.
                </p>
              </div>
            )}
          </div>
        )}

        {previewImage ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-3 mb-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewImage(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Gallery
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{previewImage.name}</h3>
                <p className="text-xs text-muted-foreground">{previewImage.category}</p>
              </div>
            </div>
            <div className="flex justify-center mb-4">
              <Button className="bg-green-500 hover:bg-green-600 text-white lv-premium-shade" onClick={() => handleSelectImage(previewImage)}>
                <Check className="h-4 w-4 mr-1" />
                Use This Image
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-xl border border-border overflow-hidden min-h-[400px]">
              <img
                src={previewImage.thumbnail_url || previewImage.image_url}
                alt={previewImage.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="relative w-[75%]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full justify-start flex-wrap flex-shrink-0 h-auto py-4">
                <TabsTrigger value="all">All</TabsTrigger>
                {categories.map(category => (
                  <TabsTrigger key={category} value={category}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="flex-1 mt-4 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64 text-destructive">
                    {error}
                  </div>
                ) : filteredImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                    <p>No images available yet</p>
                    <p className="text-sm">Gallery images will be added by the admin</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] [&>[data-radix-scroll-area-scrollbar]]:!bg-transparent [&>[data-radix-scroll-area-scrollbar]]:!border-0 [&>div]:!border-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pr-2 max-sm:pb-24">
                      {filteredImages.map(image => (
                        <div
                          key={image.id}
                          className="group relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all bg-muted"
                        >
                          <img
                            src={image.thumbnail_url || image.image_url}
                            alt={image.name}
                            loading="lazy"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <button
                              onClick={() => setPreviewImage(image)}
                              className="flex items-center gap-1.5 bg-white/90 text-foreground rounded-full px-3 py-1.5 text-xs font-medium hover:bg-white transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <button
                              onClick={() => handleSelectImage(image)}
                              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Select
                            </button>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <p className="text-white text-xs font-medium truncate">
                              {image.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4 border-t-0 max-sm:sticky max-sm:bottom-0 max-sm:z-50 max-sm:bg-background max-sm:pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <Button className="bg-red-500 hover:bg-red-600 text-white h-8 px-4 lv-premium-shade" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
