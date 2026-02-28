import React, { useState } from 'react';
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
import { usePlaceCardGallery, GalleryImage } from '@/hooks/usePlaceCardGallery';
import { Search, ImageIcon, Loader2, Eye, Check, ArrowLeft } from 'lucide-react';

interface PlaceCardGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (imageUrl: string) => void;
}

export const PlaceCardGalleryModal: React.FC<PlaceCardGalleryModalProps> = ({
  open,
  onOpenChange,
  onSelectImage,
}) => {
  const { images, categories, loading, error } = usePlaceCardGallery();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<GalleryImage | null>(null);

  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || img.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectImage = (image: GalleryImage) => {
    onSelectImage(image.image_url);
    setPreviewImage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) setPreviewImage(null); onOpenChange(val); }}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col bg-white [&~[data-radix-scroll-area-viewport]]:!border-0" style={{ zIndex: 110 }} overlayClassName="z-[105] bg-black/95">

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Image Gallery ({images.length} Cards)
          </DialogTitle>
        </DialogHeader>

        {previewImage ? (
          /* Preview View */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="outline" size="sm" onClick={() => setPreviewImage(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Gallery
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{previewImage.name}</h3>
                <p className="text-xs text-muted-foreground">{previewImage.category}</p>
              </div>
              <Button variant="gradient" onClick={() => handleSelectImage(previewImage)}>
                <Check className="h-4 w-4 mr-1" />
                Use This Image
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-xl border border-border overflow-hidden min-h-0">
              <img
                src={previewImage.image_url}
                alt={previewImage.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
          </div>
        ) : (
          /* Gallery Grid View */
          <>
            {/* Search */}
            <div className="relative w-[75%]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Tabs */}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pr-2">
                      {filteredImages.map(image => (
                        <div
                          key={image.id}
                          className="group relative aspect-[7/5] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all bg-muted"
                        >
                          <img
                            src={image.image_url}
                            alt={image.name}
                            className="w-full h-full object-contain"
                          />
                          {/* Hover overlay with View & Select buttons */}
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
                          {/* Name label */}
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

            <div className="flex justify-end pt-4 border-t-0">
              <Button className="bg-red-500 hover:bg-red-600 text-white h-8 px-4" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
