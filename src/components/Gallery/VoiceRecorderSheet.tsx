import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Square, Play, Upload } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { UploadProgress } from './UploadProgress';

interface GallerySettings {
  max_audio_duration_sec: number;
}

interface VoiceRecorderSheetProps {
  open: boolean;
  onClose: () => void;
  gallerySlug: string;
  eventId: string;
  settings: GallerySettings;
}

export const VoiceRecorderSheet: React.FC<VoiceRecorderSheetProps> = ({
  open,
  onClose,
  gallerySlug,
  eventId,
  settings,
}) => {
  const [name, setName] = useState('');
  const { 
    isRecording, 
    audioBlob, 
    duration, 
    startRecording, 
    stopRecording, 
    playPreview,
    reset 
  } = useVoiceRecorder({ maxDuration: settings.max_audio_duration_sec || 90 });
  
  const { upload, progress, retry } = useMediaUpload(gallerySlug, eventId);

  const handleUpload = async () => {
    if (!audioBlob) return;
    
    const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, { type: 'audio/webm' });
    await upload('audio', file, name.trim() || undefined);
  };

  const maxDuration = settings.max_audio_duration_sec || 90;

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[75vh]">
        <SheetHeader>
          <SheetTitle>Record Voice Message</SheetTitle>
        </SheetHeader>
        
        {!progress ? (
          <div className="mt-6 space-y-6">
            <div>
              <label className="text-sm font-medium">Your Name (Optional)</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="mt-1"
                maxLength={100}
              />
            </div>

            {/* Recording UI */}
            <div className="text-center">
              {!audioBlob && (
                <div className="space-y-4">
                  <div className="text-4xl font-mono font-bold text-[#6D28D9]">
                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                    <span className="text-sm text-muted-foreground ml-2">
                      / {Math.floor(maxDuration / 60)}:{(maxDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="w-32 h-32 rounded-full bg-red-500 hover:bg-red-600"
                    >
                      <Mic className="w-12 h-12" />
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      className="w-32 h-32 rounded-full bg-gray-800 hover:bg-gray-900"
                    >
                      <Square className="w-12 h-12" />
                    </Button>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                  </p>
                </div>
              )}

              {audioBlob && (
                <div className="space-y-4">
                  <p className="text-lg font-medium">Recording Complete!</p>
                  <p className="text-sm text-muted-foreground">{duration} seconds</p>
                  
                  <div className="flex gap-2 justify-center">
                    <Button onClick={playPreview} variant="outline" size="lg">
                      <Play className="w-5 h-5 mr-2" /> Preview
                    </Button>
                    <Button onClick={reset} variant="outline" size="lg">
                      Re-record
                    </Button>
                  </div>

                  <Button 
                    onClick={handleUpload} 
                    size="lg" 
                    className="w-full bg-[#6D28D9] hover:bg-[#5B21B6]"
                  >
                    <Upload className="w-5 h-5 mr-2" /> Upload Message
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <UploadProgress 
            {...progress} 
            onRetry={retry}
            onViewGallery={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
