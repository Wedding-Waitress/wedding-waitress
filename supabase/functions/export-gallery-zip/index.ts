import { createClient } from 'jsr:@supabase/supabase-js@2';
import JSZip from 'npm:jszip@3.10.1';

// Rate limiting map: galleryId -> timestamp
const activeExports = new Map<string, number>();

interface ExportRequest {
  galleryId: string;
  scope: 'approved' | 'all';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { galleryId, scope }: ExportRequest = await req.json();

    if (!galleryId || !['approved', 'all'].includes(scope)) {
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: gallery, error: galleryError } = await supabaseAdmin
      .from('galleries')
      .select('id, title, owner_id, event_date, event_type')
      .eq('id', galleryId)
      .eq('owner_id', user.id)
      .single();

    if (galleryError || !gallery) {
      return new Response(JSON.stringify({ error: 'Gallery not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const albumTitle = gallery.title;

    // Rate limiting
    const now = Date.now();
    const lastExport = activeExports.get(galleryId);
    if (lastExport && now - lastExport < 60000) {
      return new Response(
        JSON.stringify({ 
          error: 'An export is already in progress. Please wait a moment and try again.',
          code: 'RATE_LIMIT'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    activeExports.set(galleryId, now);

    const { data: exportRecord, error: exportError } = await supabaseAdmin
      .from('gallery_exports')
      .insert({
        gallery_id: galleryId,
        scope: scope,
        status: 'running',
        created_by: user.id,
      })
      .select()
      .single();

    if (exportError) {
      activeExports.delete(galleryId);
      throw exportError;
    }

    console.log(`Export ${exportRecord.id} started for gallery ${galleryId}`);

    processExport(supabaseAdmin, exportRecord.id, galleryId, gallery, scope)
      .finally(() => activeExports.delete(galleryId));

    return new Response(
      JSON.stringify({
        export_id: exportRecord.id,
        status: 'running',
        message: 'Export started. We\'ll notify you when it\'s ready.',
      }),
      {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to start export' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processExport(
  supabase: any,
  exportId: string,
  galleryId: string,
  gallery: any,
  scope: 'approved' | 'all'
) {
  try {
    console.log(`Processing export ${exportId}`);

    let query = supabase
      .from('media_uploads')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: true });

    if (scope === 'approved') {
      query = query.in('status', ['pending', 'approved']);
    } else {
      query = query.in('status', ['pending', 'approved']);
    }

    const { data: mediaItems, error: mediaError } = await query;
    if (mediaError) throw mediaError;

    // Fetch audio guestbook messages
    const { data: audioItems, error: audioError } = await supabase
      .from('audio_guestbook')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: true });
    
    if (audioError) console.error('Error fetching audio:', audioError);

    console.log(`Found ${mediaItems.length} items and ${audioItems?.length || 0} audio messages to export`);

    const zip = new JSZip();
    
    // Create top-level folder with EventName (DD-MM-YYYY) format
    let topFolderName = gallery.title.replace(/\s+/g, '');
    if (gallery.event_date) {
      const date = new Date(gallery.event_date);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      topFolderName = `${topFolderName} (${day}-${month}-${year})`;
    }
    
    const topFolder = zip.folder(topFolderName);
    const photosFolder = topFolder?.folder('Photos');
    const videosFolder = topFolder?.folder('Videos');
    const messagesFolder = topFolder?.folder('Messages');
    const audioFolder = topFolder?.folder('Audio');

    const manifestData: any = {
      gallery: {
        id: gallery.id,
        title: gallery.title,
        event_type: gallery.event_type,
        event_date: gallery.event_date,
        exported_at: new Date().toISOString(),
        scope: scope,
        total_items: mediaItems.length,
        total_audio: audioItems?.length || 0,
      },
      items: [],
      audio_items: [],
    };

    const videosCsvRows: string[] = [
      'id,created_at,stream_uid,stream_status,playback_url,thumbnail_url,duration_seconds,width,height,caption'
    ];

    let photoCount = 0;
    let videoCount = 0;
    let textCount = 0;

    for (const item of mediaItems) {
      const itemData: any = {
        id: item.id,
        type: item.type,
        post_type: item.post_type,
        caption: item.caption,
        created_at: item.created_at,
        status: item.status,
      };

      if (item.post_type === 'photo' && item.file_url) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('event-media')
            .download(item.file_url.replace('event-media/', ''));

          if (!downloadError && fileData) {
            const seqPadded = String(item.seq_number || ++photoCount).padStart(6, '0');
            const ext = item.mime_type?.split('/')[1] || 'jpg';
            const filename = `${seqPadded}-Photo-${albumTitle}.${ext}`;
            photosFolder?.file(filename, await fileData.arrayBuffer());
            itemData.exported_filename = `1_Photos/${filename}`;

            if (item.caption) {
              photosFolder?.file(filename.replace(/\.[^.]+$/, '.txt'), item.caption);
            }
          }
        } catch (err) {
          console.error(`Failed to download photo ${item.id}:`, err);
          itemData.error = 'Failed to download';
        }
      }

      if (item.post_type === 'video' && item.file_url && !item.cloudflare_stream_uid) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('event-media')
            .download(item.file_url.replace('event-media/', ''));

          if (!downloadError && fileData) {
            const seqPadded = String(item.seq_number || ++videoCount).padStart(6, '0');
            const ext = item.mime_type?.split('/')[1] || 'mp4';
            const filename = `${seqPadded}-Video-${albumTitle}.${ext}`;
            videosFolder?.file(filename, await fileData.arrayBuffer());
            itemData.exported_filename = `2_Videos/${filename}`;

            if (item.caption) {
              videosFolder?.file(filename.replace(/\.[^.]+$/, '.txt'), item.caption);
            }
          }
        } catch (err) {
          console.error(`Failed to download video ${item.id}:`, err);
          itemData.error = 'Failed to download';
        }
      }

      if (item.cloudflare_stream_uid) {
        const playbackUrl = `https://iframe.videodelivery.net/${item.cloudflare_stream_uid}`;
        const thumbnailUrl = item.stream_preview_image || '';
        
        videosCsvRows.push(
          `"${item.id}","${item.created_at}","${item.cloudflare_stream_uid}","${item.stream_status}","${playbackUrl}","${thumbnailUrl}",${item.duration_seconds || ''},"${item.width || ''}","${item.height || ''}","${(item.caption || '').replace(/"/g, '""')}"`
        );

        itemData.stream_uid = item.cloudflare_stream_uid;
        itemData.playback_url = playbackUrl;

        if (item.stream_preview_image) {
          try {
            const thumbnailResponse = await fetch(item.stream_preview_image);
            if (thumbnailResponse.ok) {
              const thumbnailBlob = await thumbnailResponse.arrayBuffer();
              const seqPadded = String(item.seq_number || videoCount).padStart(6, '0');
              const thumbnailFilename = `${seqPadded}-Video-Thumbnail-${albumTitle}.jpg`;
              videosFolder?.file(thumbnailFilename, thumbnailBlob);
            }
          } catch (err) {
            console.error(`Failed to download thumbnail for ${item.cloudflare_stream_uid}:`, err);
          }
        }
      }

      if (item.post_type === 'text' && item.text_content) {
        const seqPadded = String(item.seq_number || ++textCount).padStart(6, '0');
        const filename = `${seqPadded}-Guest Book-${albumTitle}.txt`;
        messagesFolder?.file(filename, item.text_content);
        itemData.exported_filename = `3_Guest_Book_Messages/${filename}`;
      }

      manifestData.items.push(itemData);
    }

    // Process audio guestbook messages
    let audioCount = 0;
    for (const audioItem of audioItems || []) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('audio-uploads')
          .download(audioItem.file_url.replace('audio-uploads/', ''));

        if (!downloadError && fileData) {
          audioCount++;
          const seqPadded = String(audioItem.seq_number || audioCount).padStart(6, '0');
          const ext = audioItem.mime_type?.split('/')[1] || 'm4a';
          const filename = `${seqPadded}-Audio-${albumTitle}.${ext}`;
          audioFolder?.file(filename, await fileData.arrayBuffer());

          manifestData.audio_items.push({
            id: audioItem.id,
            seq_number: audioItem.seq_number,
            created_at: audioItem.created_at,
            duration_seconds: audioItem.duration_seconds,
            file_size_bytes: audioItem.file_size_bytes,
            exported_filename: `Audio/${filename}`,
          });
        }
      } catch (err) {
        console.error(`Failed to download audio ${audioItem.id}:`, err);
      }
    }

    topFolder?.file('manifest.json', JSON.stringify(manifestData, null, 2));

    if (videosCsvRows.length > 1) {
      topFolder?.file('videos.csv', videosCsvRows.join('\n'));
    }

    // Create Messages.csv and Messages.txt
    if (textCount > 0) {
      const messagesCsvRows: string[] = ['timestamp,message'];
      const messagesTxtLines: string[] = [];

      for (const item of mediaItems.filter(m => m.post_type === 'text')) {
        const timestamp = new Date(item.created_at).toISOString();
        const message = (item.text_content || '').replace(/"/g, '""');
        messagesCsvRows.push(`"${timestamp}","${message}"`);
        messagesTxtLines.push(`[${format(new Date(item.created_at), 'yyyy-MM-dd HH:mm')}] ${item.text_content}`);
      }

      messagesFolder?.file('Messages.csv', messagesCsvRows.join('\n'));
      messagesFolder?.file('Messages.txt', messagesTxtLines.join('\n'));
    }

    const readme = `# ${gallery.title} - Photo & Video Export

Exported on: ${new Date().toISOString()}
Export scope: ${scope === 'approved' ? 'Approved items only' : 'All items (including pending)'}
Total items: ${mediaItems.length}
Total audio messages: ${audioItems?.length || 0}

## Folder Structure

- Photos/ - All photo files with original quality and captions
- Videos/ - Videos (direct uploads and Cloudflare Stream thumbnails)
- Messages/ - Guest book messages (CSV and TXT formats)
- Audio/ - Audio guestbook messages
- manifest.json - Complete metadata for all items
- videos.csv - Cloudflare Stream video information (playback URLs)

## Cloudflare Stream Videos

Videos uploaded via Cloudflare Stream are not included as files (they're hosted on Cloudflare).
Instead, see videos.csv for playback URLs and metadata. Thumbnails are in the Videos folder.

Generated by Wedding Waitress - https://weddingwaitress.com
`;
    topFolder?.file('README.txt', readme);

    console.log('Generating ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Generate user-facing filename in format: AlbumName (dd-MM-yyyy).zip
    // Example: JackandJill (29-11-2025).zip
    let downloadFilename = gallery.title
      .replace(/\s+/g, '')
      .replace(/&/g, 'and');
    
    if (gallery.event_date) {
      const date = new Date(gallery.event_date);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      const dateStr = `${day}-${month}-${year}`;
      downloadFilename = `${downloadFilename} (${dateStr})`;
    }
    downloadFilename = `${downloadFilename}.zip`;

    const storagePath = `${galleryId}/${exportId}.zip`;
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(storagePath, zipBlob, {
        contentType: 'application/zip',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('exports')
      .createSignedUrl(storagePath, 604800, {
        download: downloadFilename
      });

    if (signedError) throw signedError;

    await supabase
      .from('gallery_exports')
      .update({
        status: 'ready',
        file_path: storagePath,
        download_url: signedUrlData.signedUrl,
        file_size_bytes: zipBlob.byteLength,
        items_count: mediaItems.length,
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 604800000).toISOString(),
      })
      .eq('id', exportId);

    console.log(`Export ${exportId} completed successfully`);

  } catch (error: any) {
    console.error(`Export ${exportId} failed:`, error);

    await supabase
      .from('gallery_exports')
      .update({
        status: 'error',
        error_message: error.message || 'Unknown error occurred',
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportId);
  }
}
