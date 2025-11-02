import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface UploadProgressProps {
  percent: number;
  speed: number;
  eta: number;
  status: 'uploading' | 'processing' | 'success' | 'error';
  requiresApproval?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onViewGallery?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  percent,
  speed,
  eta,
  status,
  requiresApproval,
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
      
      {status === 'success' && (
        <div className="mt-4 space-y-3">
          {requiresApproval ? (
            <div className="bg-[#6D28D9] rounded-lg p-4 relative">
              {/* White circle checkmark icon on the right */}
              <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#6D28D9]" fill="white" />
              </div>
              
              <p className="text-sm text-white font-semibold mb-2 pr-10">
                Pending Review
              </p>
              <p className="text-sm text-white/95 pr-10">
                The host will review your upload before it appears in the gallery. 
                You can upload more photos while you wait!
              </p>
            </div>
          ) : (
            <div className="bg-green-600 rounded-lg p-3">
              <p className="text-sm text-white font-medium">
                ✅ Your photo is now live in the gallery!
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold shadow-md"
              >
                Upload Another
              </Button>
            )}
            {onViewGallery && (
              <Button 
                onClick={onViewGallery} 
                className="flex-1 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold shadow-md"
              >
                View Gallery 🎉
              </Button>
            )}
          </div>
        </div>
      )}

      {status === 'processing' && (
        <p className="text-xs text-muted-foreground mt-2">
          Your video is being processed. This may take a few minutes...
        </p>
      )}
    </div>
  );
};
