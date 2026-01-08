import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Play, ExternalLink, Music } from 'lucide-react';
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
}

export const SongRowEditor: React.FC<SongRowEditorProps> = ({
  data,
  sectionType,
  index,
  onSave,
  onDelete,
}) => {
  const songData = data as SongData;
  const [moment, setMoment] = useState(songData.moment || '');
  const [songTitle, setSongTitle] = useState(songData.song_title || '');
  const [artist, setArtist] = useState(songData.artist || '');
  const [link, setLink] = useState(songData.link || '');
  const [showPreview, setShowPreview] = useState(false);

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave({
        moment,
        song_title: songTitle,
        artist,
        link,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [moment, songTitle, artist, link]);

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

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Music className="w-4 h-4" />
        Row {index + 1}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Moment Select (if applicable) */}
        {showMomentSelect && (
          <Select value={moment} onValueChange={setMoment}>
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

        {/* Song Title with Autocomplete */}
        <div className={showMomentSelect ? '' : 'md:col-span-1'}>
          <SongAutocomplete
            value={songTitle}
            onChange={setSongTitle}
            onSelect={handleSongSelect}
            placeholder="Song title..."
          />
        </div>

        {/* Artist */}
        <Input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist..."
          className="bg-background"
        />

        {/* Link */}
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
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete row"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Player */}
      {showPreview && isValidLink && (
        <SongPreviewPlayer url={link} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
};
