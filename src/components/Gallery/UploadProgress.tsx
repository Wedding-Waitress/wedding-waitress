import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface UploadProgressProps {
  percent: number;
  speed: number;
  eta: number;
  status: 'uploading' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
  onViewGallery?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  percent,
  speed,
  eta,
  status,
  errorMessage,
  onRetry,
  onViewGallery,
}) => {
  return (
    <div className="mt-6 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-[#6D28D9]" />}
          {status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-[#6D28D9]" />}
          {status === 'success' && <CheckCircle className="w-4 h-4 text-success" />}
          {status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
          
          <span className="text-sm font-medium">
            {status === 'uploading' && `Uploading... ${percent}%`}
            {status === 'processing' && 'Processing...'}
            {status === 'success' && 'Upload Complete!'}
            {status === 'error' && 'Upload Failed'}
          </span>
        </div>
        
        {status === 'uploading' && speed > 0 && (
          <span className="text-xs text-muted-foreground">
            {(speed / (1024 * 1024)).toFixed(2)} MB/s · {eta}s left
          </span>
        )}
      </div>
      
      <Progress value={percent} className="h-2" />
      
      {status === 'error' && (
        <>
          {errorMessage && (
            <p className="text-sm text-destructive mt-2">{errorMessage}</p>
          )}
          {onRetry && (
            <Button onClick={onRetry} className="w-full mt-4" variant="destructive">
              Retry Upload
            </Button>
          )}
        </>
      )}
      
      {status === 'success' && onViewGallery && (
        <Button onClick={onViewGallery} className="w-full mt-4 bg-[#6D28D9] hover:bg-[#5B21B6]">
          View Gallery 🎉
        </Button>
      )}

      {status === 'processing' && (
        <p className="text-xs text-muted-foreground mt-2">
          Your video is being processed. This may take a few minutes...
        </p>
      )}
    </div>
  );
};
