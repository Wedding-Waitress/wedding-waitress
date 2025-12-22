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
import { Search, ImageIcon, Loader2 } from 'lucide-react';

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

  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || img.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectImage = (image: GalleryImage) => {
    onSelectImage(image.image_url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Image Gallery
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
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
          <TabsList className="w-full justify-start overflow-x-auto flex-shrink-0">
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
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pr-4">
                  {filteredImages.map(image => (
                    <button
                      key={image.id}
                      onClick={() => handleSelectImage(image)}
                      className="group relative aspect-[5/7] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <img
                        src={image.image_url}
                        alt={image.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium truncate">
                          {image.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
