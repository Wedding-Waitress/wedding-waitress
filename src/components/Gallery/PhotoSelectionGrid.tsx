import React from 'react';
import { PhotoThumbnail } from './PhotoThumbnail';

interface PhotoSelectionGridProps {
  files: File[];
  onRemove: (index: number) => void;
}

export const PhotoSelectionGrid: React.FC<PhotoSelectionGridProps> = ({ files, onRemove }) => {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No photos selected yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        Selected Photos ({files.length})
      </p>
      <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto">
        {files.map((file, index) => (
          <PhotoThumbnail
            key={`${file.name}-${index}`}
            file={file}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>
    </div>
  );
};
