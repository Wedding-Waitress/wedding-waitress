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
      
      // Use webm for cross-browser compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
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
    if (audioBlob && duration > 0) {
      onUploadComplete(audioBlob, duration);
    }
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

            {/* Controls */}
            <div className="flex gap-3">
              {!isRecording && !audioBlob && (
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="bg-gradient-to-r from-primary to-purple-600"
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
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>
              )}

              {audioBlob && !isRecording && (
                <>
                  <Button
                    size="lg"
                    onClick={togglePlayback}
                    variant="outline"
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

                  <Button
                    size="lg"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-gradient-to-r from-primary to-purple-600"
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
                </>
              )}
            </div>

            {audioBlob && !isRecording && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAudioBlob(null);
                  setAudioUrl(null);
                  setRecordingTime(0);
                  setDuration(0);
                  setIsPlaying(false);
                }}
              >
                Record Again
              </Button>
            )}
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