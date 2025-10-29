import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'audio';
  storage_path: string | null;
  caption: string | null;
}

export const downloadMediaAsZip = async (
  media: MediaItem[], 
  eventName: string,
  onProgress?: (current: number, total: number) => void
) => {
  const zip = new JSZip();
  const eventNameSafe = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  let counter = 1;
  let processed = 0;

  for (const item of media) {
    if (!item.storage_path) {
      processed++;
      continue;
    }

    try {
      // Download file from storage
      const bucket = item.type === 'photo' ? 'media-photos' : 
                     item.type === 'video' ? 'media-videos' : 'media-audio';
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(item.storage_path);

      if (error) {
        console.error(`Failed to download ${item.storage_path}:`, error);
        processed++;
        continue;
      }

      // Get file extension
      const ext = item.storage_path.split('.').pop() || 'jpg';

      // Generate filename: {counter}-{Type}-{EventName}.{ext}
      const typeCapitalized = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      const filename = `${String(counter).padStart(6, '0')}-${typeCapitalized}-${eventNameSafe}.${ext}`;

      // Add to ZIP
      zip.file(filename, data);

      counter++;
      processed++;
      
      if (onProgress) {
        onProgress(processed, media.length);
      }
    } catch (error) {
      console.error(`Error processing ${item.id}:`, error);
      processed++;
      if (onProgress) {
        onProgress(processed, media.length);
      }
    }
  }

  // Generate ZIP and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${eventNameSafe}-album-${Date.now()}.zip`);
};
