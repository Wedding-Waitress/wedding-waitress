import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link, Play, X, Music } from 'lucide-react';
import { detectMusicPlatform, extractYouTubeId, extractSpotifyId } from '@/lib/djMCQuestionnaireTemplates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DJMCMusicUrlFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DJMCMusicUrlField({
  value,
  onChange,
  placeholder = 'Paste YouTube, Spotify, or Apple Music link',
  disabled = false,
}: DJMCMusicUrlFieldProps) {
  const [showPreview, setShowPreview] = useState(false);
  const platform = value ? detectMusicPlatform(value) : 'unknown';

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value || null;
    onChange(newValue);
  }, [onChange]);

  const clearUrl = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const renderPlatformIcon = () => {
    switch (platform) {
      case 'youtube':
        return (
          <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center">
            <Play className="h-3 w-3 text-white fill-white" />
          </div>
        );
      case 'spotify':
        return (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Music className="h-3 w-3 text-white" />
          </div>
        );
      case 'apple':
        return (
          <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
            <Music className="h-3 w-3 text-white" />
          </div>
        );
      default:
        return <Link className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderPreviewContent = () => {
    if (!value) return null;

    if (platform === 'youtube') {
      const videoId = extractYouTubeId(value);
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full aspect-video rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    if (platform === 'spotify') {
      const spotifyData = extractSpotifyId(value);
      if (spotifyData) {
        return (
          <iframe
            src={`https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}`}
            className="w-full h-[152px] rounded-lg"
            allow="encrypted-media"
          />
        );
      }
    }

    // For Apple Music or unknown, just show a link
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Preview not available for this platform
        </p>
        <Button asChild variant="outline">
          <a href={value} target="_blank" rel="noopener noreferrer">
            Open in new tab
          </a>
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className="relative flex items-center gap-2">
        <div className="absolute left-3 flex items-center pointer-events-none">
          {renderPlatformIcon()}
        </div>
        <Input
          type="url"
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-20 text-sm"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowPreview(true)}
                title="Preview"
              >
                <Play className="h-4 w-4 text-primary" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearUrl}
                title="Clear"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {renderPlatformIcon()}
              <span>Music Preview</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {renderPreviewContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
