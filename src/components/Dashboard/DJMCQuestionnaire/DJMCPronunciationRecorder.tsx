/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * This DJ-MC Questionnaire feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break questionnaire data, sharing, or PDF export
 *
 * Last locked: 2026-02-19
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Trash2, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  createDJMCPronunciationSignedUrl,
  deleteDJMCPronunciation,
  uploadDJMCPronunciation,
} from '@/lib/djmcPronunciationStorage';

interface DJMCPronunciationRecorderProps {
  audioPath: string | null;
  legacyAudioUrl?: string | null;
  onChange: (path: string | null) => void;
  eventId: string;
  itemId: string;
  shareToken?: string;
  disabled?: boolean;
}

export function DJMCPronunciationRecorder({
  audioPath,
  legacyAudioUrl,
  onChange,
  eventId,
  itemId,
  shareToken,
  disabled = false,
}: DJMCPronunciationRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setSignedUrl(null);
    if (!audioPath) {
      // Legacy public recordings remain available to authenticated organisers
      // until the service-role copy/relink sweep has migrated them. They are
      // intentionally never exposed in public share-token payloads.
      if (legacyAudioUrl && !shareToken) setSignedUrl(legacyAudioUrl);
      return () => { cancelled = true; };
    }

    createDJMCPronunciationSignedUrl(audioPath, { eventId, itemId, shareToken })
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch((error) => {
        console.error('Error creating pronunciation playback link:', error);
      });

    return () => { cancelled = true; };
  }, [audioPath, eventId, itemId, legacyAudioUrl, shareToken]);

  const uploadAudio = useCallback(async (blob: Blob) => {
    setUploading(true);
    try {
      const filePath = await uploadDJMCPronunciation(blob, { eventId, itemId, shareToken });
      onChange(filePath);

      toast({
        className: 'ww-djmc-toast',
        title: 'Recording Saved',
        description: 'Pronunciation has been recorded',
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        className: 'ww-djmc-toast',
        title: 'Error',
        description: 'Failed to save recording',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [eventId, itemId, onChange, shareToken, toast]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await uploadAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        className: 'ww-djmc-toast',
        title: 'Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [toast, uploadAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const playRecording = useCallback(async () => {
    if (!audioPath && !legacyAudioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    let playbackUrl = signedUrl;
    if (!playbackUrl && audioPath) {
      try {
        playbackUrl = await createDJMCPronunciationSignedUrl(audioPath, { eventId, itemId, shareToken });
        setSignedUrl(playbackUrl);
      } catch (error) {
        console.error('Error creating pronunciation playback link:', error);
        toast({
          className: 'ww-djmc-toast',
          title: 'Playback unavailable',
          description: 'Could not securely load this recording.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!playbackUrl) return;
    const audio = new Audio(playbackUrl);
    audioRef.current = audio;
    
    audio.onended = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };
    
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      audioRef.current = null;
      setIsPlaying(false);
      console.error('Error playing pronunciation recording:', error);
    }
  }, [audioPath, eventId, itemId, legacyAudioUrl, shareToken, signedUrl, toast]);

  const deleteRecording = useCallback(async () => {
    const storedReference = audioPath || legacyAudioUrl;
    if (!storedReference) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setUploading(true);
    try {
      await deleteDJMCPronunciation(storedReference, { eventId, itemId, shareToken });
      setSignedUrl(null);
      onChange(null);
    } catch (error) {
      console.error('Error deleting pronunciation recording:', error);
      toast({
        className: 'ww-djmc-toast',
        title: 'Delete failed',
        description: 'The recording was not removed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [audioPath, eventId, itemId, legacyAudioUrl, onChange, shareToken, toast]);

  if (audioPath || (legacyAudioUrl && !shareToken)) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={playRecording}
          disabled={disabled || uploading}
          title={isPlaying ? 'Stop' : 'Play'}
          aria-label={isPlaying ? 'Stop playback' : 'Play recording'}
        >
          {isPlaying ? (
            <Square size={17} strokeWidth={1.8} className="text-primary" />
          ) : (
            <Play size={17} strokeWidth={1.8} className="text-primary" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={deleteRecording}
          disabled={disabled || uploading}
          title="Delete recording"
          aria-label="Delete recording"
        >
          <Trash2 size={17} strokeWidth={1.8} className="text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'ghost'}
      size="icon"
      className="h-8 w-8"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || uploading}
      title={isRecording ? 'Stop recording' : 'Record pronunciation'}
      aria-label={isRecording ? 'Stop recording' : 'Record pronunciation'}
    >
      {isRecording ? (
        <Square size={17} strokeWidth={1.8} className="animate-pulse" />
      ) : uploading ? (
        <LoaderCircle size={17} strokeWidth={1.8} className="text-primary animate-spin" />
      ) : (
        <Mic size={17} strokeWidth={1.8} className="text-muted-foreground hover:text-primary" />
      )}
    </Button>
  );
}
