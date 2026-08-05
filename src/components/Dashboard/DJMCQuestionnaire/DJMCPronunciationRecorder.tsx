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
import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Trash2, LoaderCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DJMCPronunciationRecorderProps {
  audioUrl: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function DJMCPronunciationRecorder({
  audioUrl,
  onChange,
  disabled = false,
}: DJMCPronunciationRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

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
        title: 'Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const uploadAudio = async (blob: Blob) => {
    setUploading(true);
    try {
      const fileName = `pronunciation_${Date.now()}.webm`;
      const filePath = `pronunciations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-logos') // Reusing existing bucket
        .upload(filePath, blob, {
          contentType: 'audio/webm',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('venue-logos')
        .getPublicUrl(filePath);

      onChange(publicUrl);

      toast({
        title: 'Recording Saved',
        description: 'Pronunciation has been recorded',
      });
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast({
        title: 'Error',
        description: 'Failed to save recording',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const playRecording = useCallback(() => {
    if (!audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onended = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };
    
    audio.play();
    setIsPlaying(true);
  }, [audioUrl]);

  const deleteRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    onChange(null);
  }, [onChange]);

  if (audioUrl) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={playRecording}
          disabled={disabled}
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
          disabled={disabled}
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
