import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioRecorderModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: (audioBlob: Blob, duration: number) => void;
  uploading?: boolean;
}

const MAX_DURATION_SECONDS = 120; // 2 minutes

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({
  open,
  onClose,
  onUploadComplete,
  uploading = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect best supported MIME type with iOS Safari fallback
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')) {
        mimeType = 'audio/mp4;codecs=mp4a.40.2';
      }
      
      console.log('🎤 Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setDuration(recordingTime);
        
        // Create URL for playback
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          // Auto-stop at max duration
          if (newTime >= MAX_DURATION_SECONDS) {
            stopRecording();
            toast({
              title: 'Maximum Duration Reached',
              description: 'Recording stopped at 2 minutes.',
            });
          }
          
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to record audio.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleUpload = () => {
    if (!audioBlob || duration <= 0) return;
    
    // Validate audio size BEFORE upload
    const sizeMB = audioBlob.size / (1024 * 1024);
    const MAX_SIZE_MB = 250;
    
    if (sizeMB > MAX_SIZE_MB) {
      toast({
        title: 'Audio Too Large',
        description: `Recording is ${sizeMB.toFixed(1)}MB. Maximum is ${MAX_SIZE_MB}MB. Try a shorter message.`,
        variant: 'destructive',
      });
      return;
    }
    
    console.log('📊 Audio Details:', {
      size: `${sizeMB.toFixed(2)} MB`,
      duration: `${formatTime(duration)}`,
      format: audioBlob.type,
    });
    
    onUploadComplete(audioBlob, duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setDuration(0);
    setIsPlaying(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">🎤 Audio Guestbook</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recording Interface */}
          <div className="flex flex-col items-center space-y-4">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
              isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-primary/10'
            }`}>
              <Mic className={`w-16 h-16 ${isRecording ? 'text-red-500' : 'text-primary'}`} />
            </div>

            {/* Timer */}
            <div className="text-center">
              <div className="text-4xl font-bold tabular-nums">
                {formatTime(recordingTime)}
              </div>
              {isRecording && (
                <p className="text-sm text-muted-foreground mt-1">
                  Recording... (max {MAX_DURATION_SECONDS / 60} min)
                </p>
              )}
              {audioBlob && !isRecording && (
                <p className="text-sm text-muted-foreground mt-1">
                  Duration: {formatTime(duration)}
                </p>
              )}
            </div>

            {/* Vertically Stacked Action Buttons */}
            <div className="flex flex-col w-full gap-4 px-4">
              {!isRecording && !audioBlob && (
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="w-full bg-gradient-to-r from-primary to-purple-600"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <Button
                  size="lg"
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              )}

              {!isRecording && (
                <>
                  {/* Play Preview Button */}
                  <Button
                    size="lg"
                    onClick={togglePlayback}
                    variant="outline"
                    disabled={!audioBlob}
                    className={`w-full ${!audioBlob ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause Preview
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Play Preview
                      </>
                    )}
                  </Button>

                  {/* Upload Button */}
                  <Button
                    size="lg"
                    onClick={handleUpload}
                    disabled={!audioBlob || uploading}
                    className={`w-full bg-gradient-to-r from-primary to-purple-600 ${
                      !audioBlob || uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Upload Audio Guestbook
                      </>
                    )}
                  </Button>

                  {/* Record Again Button */}
                  <Button
                    variant="ghost"
                    size="lg"
                    disabled={!audioBlob}
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioUrl(null);
                      setRecordingTime(0);
                      setDuration(0);
                      setIsPlaying(false);
                    }}
                    className={`w-full ${!audioBlob ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    Record Again
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Hidden audio player for preview */}
          {audioUrl && (
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};