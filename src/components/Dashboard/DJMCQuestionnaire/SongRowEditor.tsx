import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Play, ExternalLink, Music, Copy } from 'lucide-react';
import { SongPreviewPlayer } from './SongPreviewPlayer';
import { SongAutocomplete } from './SongAutocomplete';
import type { SongData, ItemData } from '@/types/djmcQuestionnaire';
import { CEREMONY_MUSIC_MOMENTS, MAIN_EVENT_MOMENTS } from '@/types/djmcQuestionnaire';

interface SongRowEditorProps {
  data: ItemData;
  sectionType: string;
  index: number;
  onSave: (data: ItemData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const SongRowEditor: React.FC<SongRowEditorProps> = ({
  data,
  sectionType,
  index,
  onSave,
  onDelete,
  onDuplicate,
}) => {
  const songData = data as SongData;
  const [moment, setMoment] = useState(songData.moment || '');
  const [customMoment, setCustomMoment] = useState('');
  const [isCustomMoment, setIsCustomMoment] = useState(false);
  const [songTitle, setSongTitle] = useState(songData.song_title || '');
  const [artist, setArtist] = useState(songData.artist || '');
  const [link, setLink] = useState(songData.link || '');
  const [showPreview, setShowPreview] = useState(false);

  // Detect if moment is custom
  useEffect(() => {
    const moments = getMoments();
    if (songData.moment && !moments.includes(songData.moment)) {
      setIsCustomMoment(true);
      setCustomMoment(songData.moment);
      setMoment('custom');
    }
  }, []);

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      const finalMoment = isCustomMoment ? customMoment : moment;
      onSave({
        moment: finalMoment,
        song_title: songTitle,
        artist,
        link,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [moment, customMoment, isCustomMoment, songTitle, artist, link]);

  const getMoments = () => {
    switch (sectionType) {
      case 'ceremony_music':
        return CEREMONY_MUSIC_MOMENTS;
      case 'main_event_songs':
        return MAIN_EVENT_MOMENTS;
      default:
        return [];
    }
  };

  const moments = getMoments();
  const showMomentSelect = moments.length > 0;

  const isValidLink = link && (
    link.includes('youtube.com') || 
    link.includes('youtu.be') || 
    link.includes('spotify.com') ||
    link.includes('music.apple.com')
  );

  const handleSongSelect = (song: { title: string; artist: string }) => {
    setSongTitle(song.title);
    setArtist(song.artist);
  };

  const handleMomentChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomMoment(true);
      setMoment('custom');
    } else {
      setIsCustomMoment(false);
      setMoment(value);
      setCustomMoment('');
    }
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Music className="w-4 h-4" />
        Row {index + 1}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Moment Select (if applicable) */}
        {showMomentSelect && (
          <div className="md:col-span-3">
            {isCustomMoment ? (
              <Input
                value={customMoment}
                onChange={(e) => setCustomMoment(e.target.value)}
                placeholder="Enter custom moment..."
                className="bg-background"
                onBlur={() => {
                  if (!customMoment.trim()) {
                    setIsCustomMoment(false);
                    setMoment('');
                  }
                }}
              />
            ) : (
              <Select value={moment} onValueChange={handleMomentChange}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select moment..." />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {moments.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Song Title with Autocomplete */}
        <div className={showMomentSelect ? 'md:col-span-3' : 'md:col-span-4'}>
          <SongAutocomplete
            value={songTitle}
            onChange={setSongTitle}
            onSelect={handleSongSelect}
            placeholder="Song title..."
          />
        </div>

        {/* Artist */}
        <div className={showMomentSelect ? 'md:col-span-2' : 'md:col-span-3'}>
          <Input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist..."
            className="bg-background"
          />
        </div>

        {/* Link */}
        <div className={showMomentSelect ? 'md:col-span-4' : 'md:col-span-5'}>
          <div className="flex items-center gap-2">
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="YouTube/Spotify link..."
              className="bg-background flex-1"
            />
            
            {isValidLink && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowPreview(!showPreview)}
                  title="Preview song"
                >
                  <Play className="w-4 h-4 text-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => window.open(link, '_blank')}
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onDuplicate}
              title="Duplicate row"
            >
              <Copy className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete row"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Player */}
      {showPreview && isValidLink && (
        <SongPreviewPlayer url={link} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
};
