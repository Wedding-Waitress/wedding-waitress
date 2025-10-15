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
  // Helper: List all files in storage bucket with pagination
  async function listAllFiles(bucket: string, prefix: string): Promise<string[]> {
    const allFiles: string[] = [];
    let offset = 0;
    const limit = 1000;
    
    while (true) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit, offset });
      
      if (error) {
        console.error(`Error listing ${bucket}/${prefix}:`, error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      for (const file of data) {
        if (!file.name.endsWith('/') && file.name !== '.emptyFolderPlaceholder') {
          allFiles.push(`${prefix}${file.name}`);
        }
      }
      
      if (data.length < limit) break;
      offset += limit;
    }
    
    return allFiles;
  }

  // Helper: Fetch binary using signed URL (guaranteed to work)
  async function fetchBinary(bucket: string, path: string): Promise<ArrayBuffer | null> {
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      
      if (signedError || !signedData?.signedUrl) {
        console.error(`Failed to create signed URL for ${bucket}/${path}:`, signedError);
        return null;
      }
      
      const response = await fetch(signedData.signedUrl, { cache: 'no-store' });
      if (!response.ok) {
        console.error(`HTTP ${response.status} fetching ${path}`);
        return null;
      }
      
      return await response.arrayBuffer();
    } catch (err) {
      console.error(`Exception fetching ${bucket}/${path}:`, err);
      return null;
    }
  }

  // Helper: Simple date formatter (no dependencies)
  function simpleFormat(dateStr: string): string {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  try {
    console.log(`Processing export ${exportId}`);

    // Build storage prefixes
    const mediaPrefix = `galleries/${galleryId}/`;
    const audioPrefix = `galleries/${galleryId}/audio/`;

    console.log(`Listing files from event-media bucket, prefix: ${mediaPrefix}`);

    // List all files from storage
    const mediaFiles = await listAllFiles('event-media', mediaPrefix);
    console.log(`Found ${mediaFiles.length} media files in storage`);

    const audioFiles = await listAllFiles('audio-uploads', audioPrefix);
    console.log(`Found ${audioFiles.length} audio files in storage`);

    // Fetch text messages from DB
    const { data: textMessages, error: textError } = await supabase
      .from('media_uploads')
      .select('id, text_content, created_at, seq_number')
      .eq('gallery_id', galleryId)
      .eq('post_type', 'text')
      .order('created_at', { ascending: true });

    if (textError) console.error('Error fetching text messages:', textError);

    // Create ZIP structure
    const zip = new JSZip();

    // Sanitize album name (no spaces around &)
    const albumNameSanitized = gallery.title
      .replace(/\s*&\s*/g, '&')
      .replace(/\s+/g, '');

    // Top-level folder name: AlbumName (DD-MM-YYYY)
    let topFolderName = albumNameSanitized;
    if (gallery.event_date) {
      const date = new Date(gallery.event_date);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      topFolderName = `${albumNameSanitized} (${day}-${month}-${year})`;
    }

    const topFolder = zip.folder(topFolderName);
    const photosFolder = topFolder?.folder('Photos');
    const videosFolder = topFolder?.folder('Videos');
    const audioFolder = topFolder?.folder('Audio');

    // Track stats
    let photoCount = 0;
    let videoCount = 0;
    let audioCount = 0;
    let failedCount = 0;

    // Download all media files with Promise.all
    console.log('Downloading media files...');
    const mediaDownloads = mediaFiles.map(async (filePath) => {
      const binary = await fetchBinary('event-media', filePath);
      if (!binary) {
        failedCount++;
        return;
      }
      
      const fileName = filePath.split('/').pop() || 'unknown';
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      
      // Determine if photo or video based on extension
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
        photoCount++;
        const seqPadded = String(photoCount).padStart(6, '0');
        const newFileName = `${seqPadded}-Photo-${albumNameSanitized}.${ext}`;
        photosFolder?.file(newFileName, binary);
      } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
        videoCount++;
        const seqPadded = String(videoCount).padStart(6, '0');
        const newFileName = `${seqPadded}-Video-${albumNameSanitized}.${ext}`;
        videosFolder?.file(newFileName, binary);
      } else {
        // Unknown type, put in Videos folder
        videosFolder?.file(fileName, binary);
      }
    });

    // Download audio files
    console.log('Downloading audio files...');
    const audioDownloads = audioFiles.map(async (filePath) => {
      const binary = await fetchBinary('audio-uploads', filePath);
      if (!binary) {
        failedCount++;
        return;
      }
      
      audioCount++;
      const fileName = filePath.split('/').pop() || 'unknown';
      const ext = fileName.split('.').pop() || 'm4a';
      const seqPadded = String(audioCount).padStart(6, '0');
      const newFileName = `${seqPadded}-Audio-${albumNameSanitized}.${ext}`;
      audioFolder?.file(newFileName, binary);
    });

    // Wait for ALL downloads to complete
    await Promise.all([...mediaDownloads, ...audioDownloads]);

    console.log(`Downloaded: ${photoCount} photos, ${videoCount} videos, ${audioCount} audio. Failed: ${failedCount}`);

    // Add Messages CSV and TXT
    if (textMessages && textMessages.length > 0) {
      const messagesCsvRows = ['timestamp,message'];
      const messagesTxtLines: string[] = [];
      
      for (const msg of textMessages) {
        const timestamp = new Date(msg.created_at).toISOString();
        const message = (msg.text_content || '').replace(/"/g, '""');
        messagesCsvRows.push(`"${timestamp}","${message}"`);
        messagesTxtLines.push(`[${simpleFormat(msg.created_at)}] ${msg.text_content}`);
      }
      
      topFolder?.file('Messages.csv', messagesCsvRows.join('\n'));
      topFolder?.file('Messages.txt', messagesTxtLines.join('\n\n'));
    }

    // Add README
    const readme = `# ${gallery.title} - Photo & Video Export

Exported on: ${new Date().toISOString()}
Total photos: ${photoCount}
Total videos: ${videoCount}
Total audio: ${audioCount}
Failed downloads: ${failedCount}

Generated by Wedding Waitress - https://weddingwaitress.com
`;
    topFolder?.file('README.txt', readme);

    // Generate ZIP
    console.log('Generating ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Filename: AlbumName (DD-MM-YYYY).zip
    let downloadFilename = albumNameSanitized;
    if (gallery.event_date) {
      const date = new Date(gallery.event_date);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      downloadFilename = `${albumNameSanitized} (${day}-${month}-${year})`;
    }
    downloadFilename = `${downloadFilename}.zip`;

    // Upload to exports bucket
    const storagePath = `${galleryId}/${exportId}.zip`;
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(storagePath, zipBlob, {
        contentType: 'application/zip',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    // Create signed download URL
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from('exports')
      .createSignedUrl(storagePath, 604800, {
        download: downloadFilename
      });

    if (signedError) throw signedError;

    // Update export record
    await supabase
      .from('gallery_exports')
      .update({
        status: 'ready',
        file_path: storagePath,
        download_url: signedUrlData.signedUrl,
        file_size_bytes: zipBlob.byteLength,
        items_count: photoCount + videoCount + audioCount,
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 604800000).toISOString(),
      })
      .eq('id', exportId);

    console.log(`Export ${exportId} completed: ${photoCount} photos, ${videoCount} videos, ${audioCount} audio`);

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
