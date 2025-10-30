import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface PhotoThumbnailProps {
  file: File;
  onRemove: () => void;
}

export const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({ file, onRemove }) => {
  const [preview, setPreview] = useState<string>('');
  
  useEffect(() => {
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [file]);
  
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
      {preview && (
        <img src={preview} alt={file.name} className="w-full h-full object-cover" />
      )}
      
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors z-10"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1.5 truncate">
        {file.name} • {(file.size / 1024 / 1024).toFixed(1)}MB
      </div>
    </div>
  );
};
