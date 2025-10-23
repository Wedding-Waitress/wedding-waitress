import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { validateMusicURL, getPlatformName } from '@/lib/urlValidation';
import { fetchBulkMetadata, SongData } from '@/lib/musicMetadataFetcher';

interface BulkSongImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  sectionLabel: string;
  onImport: (songs: SongData[]) => Promise<void>;
}

export const BulkSongImportModal = ({ 
  open, 
  onOpenChange, 
  sectionId, 
  sectionLabel, 
  onImport 
}: BulkSongImportModalProps) => {
  const [inputText, setInputText] = useState('');
  const [validUrls, setValidUrls] = useState<string[]>([]);
  const [invalidUrls, setInvalidUrls] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const lines = inputText.split('\n').filter(l => l.trim());
    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    lines.forEach(line => {
      const trimmed = line.trim();
      const result = validateMusicURL(trimmed);
      
      if (result.isValid && result.normalizedUrl) {
        if (!seen.has(result.normalizedUrl)) {
          valid.push(result.normalizedUrl);
          seen.add(result.normalizedUrl);
        }
      } else if (trimmed) {
        invalid.push(trimmed);
      }
    });

    setValidUrls(valid);
    setInvalidUrls(invalid);
  }, [inputText]);

  const handleImport = async () => {
    setFetching(true);
    setImportProgress({ current: 0, total: validUrls.length });

    try {
      const metadataList = await fetchBulkMetadata(validUrls);
      
      const songs: SongData[] = metadataList.map((metadata, index) => {
        setImportProgress({ current: index + 1, total: validUrls.length });
        return {
          song: metadata.title,
          artist: metadata.artist,
          link: metadata.url
        };
      });

      await onImport(songs);
      onOpenChange(false);
      setInputText('');
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setFetching(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Songs to "{sectionLabel}"</DialogTitle>
          <DialogDescription>
            Paste YouTube, Spotify, or Apple Music links below (one per line). 
            We'll automatically extract song details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder={`Paste your music links here...
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
https://music.apple.com/us/album/...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
            disabled={fetching}
          />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {validUrls.length > 0 && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {validUrls.length} valid
                </span>
              )}
              {invalidUrls.length > 0 && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {invalidUrls.length} invalid
                </span>
              )}
            </div>
          </div>

          {validUrls.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30 max-h-[200px] overflow-y-auto">
              <h4 className="text-sm font-medium mb-2">Preview ({validUrls.length} songs)</h4>
              <div className="space-y-1">
                {validUrls.slice(0, 10).map((url, idx) => {
                  const validation = validateMusicURL(url);
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {getPlatformName(validation.platform)}
                      </Badge>
                      <span className="truncate text-muted-foreground">{url}</span>
                    </div>
                  );
                })}
                {validUrls.length > 10 && (
                  <p className="text-xs text-muted-foreground italic">
                    + {validUrls.length - 10} more...
                  </p>
                )}
              </div>
            </div>
          )}

          {invalidUrls.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invalid URLs detected</AlertTitle>
              <AlertDescription className="text-xs space-y-1 mt-2">
                {invalidUrls.slice(0, 3).map((url, idx) => (
                  <div key={idx} className="font-mono truncate">{url}</div>
                ))}
                {invalidUrls.length > 3 && (
                  <p className="italic">+ {invalidUrls.length - 3} more</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {fetching && (
            <div className="space-y-2">
              <Progress value={(importProgress.current / importProgress.total) * 100} />
              <p className="text-xs text-center text-muted-foreground">
                Importing {importProgress.current} of {importProgress.total} songs...
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={fetching}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={validUrls.length === 0 || fetching}
            className="bg-[#6D28D9] hover:bg-[#6D28D9]/90"
          >
            {fetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import {validUrls.length} Songs
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
