import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VenueLogoUploadProps {
  logoUrl: string | null;
  onUpload: (url: string) => void;
}

export const VenueLogoUpload: React.FC<VenueLogoUploadProps> = ({ logoUrl, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image under 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `venue-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('venue-logos')
        .getPublicUrl(fileName);

      onUpload(publicUrl);

      toast({
        title: '✓ Uploaded',
        description: 'Venue logo uploaded successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload venue logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-48 h-24 flex-shrink-0">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Venue Logo"
          className="w-full h-full object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => document.getElementById('logo-upload')?.click()}
        />
      ) : (
        <div
          className="w-full h-full border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:bg-muted transition-colors"
          onClick={() => document.getElementById('logo-upload')?.click()}
        >
          <div className="text-center text-sm text-muted-foreground">
            {uploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto mb-1" />
                Upload Venue Logo
              </>
            )}
          </div>
        </div>
      )}
      <input
        id="logo-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
  );
};
