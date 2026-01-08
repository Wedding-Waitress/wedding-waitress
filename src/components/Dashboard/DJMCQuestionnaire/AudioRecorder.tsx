import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { useDJMCQuestionnaire } from '@/hooks/useDJMCQuestionnaire';

interface AudioRecorderProps {
  itemId: string;
  existingAudioUrl?: string | null;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ itemId, existingAudioUrl }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimeout(() => mediaRecorder.state === 'recording' && mediaRecorder.stop(), 10000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-1">
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}
      
      {audioUrl ? (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayback} title="Play pronunciation">
          {isPlaying ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary" />}
        </Button>
      ) : null}

      <Button
        variant={isRecording ? "destructive" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={isRecording ? stopRecording : startRecording}
        title={isRecording ? "Stop recording" : "Record pronunciation"}
      >
        {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>
    </div>
  );
};
