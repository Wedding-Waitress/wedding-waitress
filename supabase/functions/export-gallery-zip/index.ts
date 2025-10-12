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

    // Fetch media items matching the same filter as the gallery viewer
    const { data: mediaItems, error: mediaError } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('gallery_id', galleryId)
      .in('post_type', ['photo', 'video', 'text'])
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: true });
    if (mediaError) throw mediaError;

    console.log(`Found ${mediaItems.length} items to export`);

    const zip = new JSZip();
    const photosFolder = zip.folder('1_Photos');
    const videosFolder = zip.folder('2_Videos');
    const messagesFolder = zip.folder('3_Guest_Book_Messages');

    const manifestData: any = {
      gallery: {
        id: gallery.id,
        title: gallery.title,
        event_type: gallery.event_type,
        event_date: gallery.event_date,
        exported_at: new Date().toISOString(),
        scope: scope,
        total_items: mediaItems.length,
      },
      items: [],
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
            const filename = `photo_${++photoCount}_${item.id.substring(0, 8)}.${item.mime_type?.split('/')[1] || 'jpg'}`;
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
            const filename = `video_${++videoCount}_${item.id.substring(0, 8)}.${item.mime_type?.split('/')[1] || 'mp4'}`;
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
              videosFolder?.file(`stream_thumbnail_${item.cloudflare_stream_uid}.jpg`, thumbnailBlob);
            }
          } catch (err) {
            console.error(`Failed to download thumbnail for ${item.cloudflare_stream_uid}:`, err);
          }
        }
      }

      if (item.post_type === 'text' && item.text_content) {
        const filename = `message_${++textCount}_${item.id.substring(0, 8)}.txt`;
        messagesFolder?.file(filename, item.text_content);
        itemData.exported_filename = `3_Guest_Book_Messages/${filename}`;
      }

      manifestData.items.push(itemData);
    }

    zip.file('manifest.json', JSON.stringify(manifestData, null, 2));

    if (videosCsvRows.length > 1) {
      zip.file('videos.csv', videosCsvRows.join('\n'));
    }

    const readme = `# ${gallery.title} - Photo & Video Export

Exported on: ${new Date().toISOString()}
Export scope: ${scope === 'approved' ? 'Approved items only' : 'All items (including pending)'}
Total items: ${mediaItems.length}

## Folder Structure

- 1_Photos/ - All photo files with original quality and captions
- 2_Videos/ - Videos (direct uploads and Cloudflare Stream thumbnails)
- 3_Guest_Book_Messages/ - Guest book messages and text posts
- manifest.json - Complete metadata for all items
- videos.csv - Cloudflare Stream video information (playback URLs)

## Cloudflare Stream Videos

Videos uploaded via Cloudflare Stream are not included as files (they're hosted on Cloudflare).
Instead, see videos.csv for playback URLs and metadata. Thumbnails are in the 2_Videos folder.

Generated by Wedding Waitress - https://weddingwaitress.com
`;
    zip.file('README.txt', readme);

    console.log('Generating ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const filename = `${galleryId}/${exportId}.zip`;
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filename, zipBlob, {
        contentType: 'application/zip',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('exports')
      .createSignedUrl(filename, 604800);

    if (signedError) throw signedError;

    await supabase
      .from('gallery_exports')
      .update({
        status: 'ready',
        file_path: filename,
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
