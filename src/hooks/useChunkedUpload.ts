import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_RETRIES_PER_CHUNK = 3;
const RETRY_DELAY_MS = 1000;

export interface ChunkProgress {
  chunkIndex: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  retries: number;
  error?: string;
}

interface UseChunkedUploadProps {
  gallerySlug: string;
  onComplete?: (mediaId: string) => void;
  onError?: (error: string) => void;
}

export const useChunkedUpload = ({ gallerySlug, onComplete, onError }: UseChunkedUploadProps) => {
  const [chunkProgresses, setChunkProgresses] = useState<ChunkProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'paused' | 'completed' | 'error'>('idle');
  const abortController = useRef<AbortController | null>(null);
  const isPaused = useRef(false);

  const updateChunkProgress = useCallback((index: number, update: Partial<ChunkProgress>) => {
    setChunkProgresses((prev) => {
      const newProgresses = [...prev];
      newProgresses[index] = { ...newProgresses[index], ...update };
      
      // Calculate overall progress
      const totalProgress = newProgresses.reduce((sum, chunk) => {
        if (chunk.status === 'success') return sum + 100;
        if (chunk.status === 'uploading') return sum + chunk.progress;
        return sum;
      }, 0);
      setOverallProgress(Math.round(totalProgress / newProgresses.length));
      
      return newProgresses;
    });
  }, []);

  const uploadChunk = useCallback(
    async (
      chunk: Blob,
      chunkIndex: number,
      chunkPath: string,
      chunkToken: string
    ): Promise<boolean> => {
      console.log(`🟡 Uploading chunk ${chunkIndex}`, {
        chunkSize: chunk.size,
        chunkPath,
        hasToken: !!chunkToken,
      });
      
      let retries = 0;

      while (retries < MAX_RETRIES_PER_CHUNK) {
        if (isPaused.current) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        try {
          updateChunkProgress(chunkIndex, { status: 'uploading', retries, progress: 0 });

          // Use Supabase's official uploadToSignedUrl method
          const { error: uploadError } = await supabase.storage
            .from('event-media')
            .uploadToSignedUrl(
              chunkPath,
              chunkToken,
              chunk,
              { contentType: 'application/octet-stream' }
            );

          if (uploadError) {
            throw new Error(uploadError.message || 'Chunk upload failed');
          }

          updateChunkProgress(chunkIndex, { status: 'success', progress: 100 });
          console.log(`🟢 Chunk ${chunkIndex} uploaded successfully`, {
            retries,
          });
          return true;
        } catch (error: any) {
          retries++;
          const errorMessage = error.message || 'Unknown error';
          console.error(`❌ Chunk ${chunkIndex} upload failed (attempt ${retries})`, {
            error: errorMessage,
            willRetry: retries < MAX_RETRIES_PER_CHUNK,
          });

          if (retries >= MAX_RETRIES_PER_CHUNK) {
            updateChunkProgress(chunkIndex, { 
              status: 'error', 
              error: errorMessage,
              retries 
            });
            return false;
          }

          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * retries));
        }
      }

      console.error(`❌ Chunk ${chunkIndex} FAILED after ${MAX_RETRIES_PER_CHUNK} retries`);
      return false;
    },
    [updateChunkProgress]
  );

  const uploadFile = useCallback(
    async (file: File, caption?: string): Promise<string | null> => {
      console.log('🔵 useChunkedUpload.uploadFile() START', {
        timestamp: new Date().toISOString(),
        filename: file.name,
        fileSize: file.size,
        chunkSize: CHUNK_SIZE,
        estimatedChunks: Math.ceil(file.size / CHUNK_SIZE),
      });
      
      try {
        setStatus('uploading');
        abortController.current = new AbortController();

        // Split file into chunks
        const chunks: Blob[] = [];
        for (let start = 0; start < file.size; start += CHUNK_SIZE) {
          chunks.push(file.slice(start, start + CHUNK_SIZE));
        }

        // Initialize progress tracking
        setChunkProgresses(
          chunks.map((_, index) => ({
            chunkIndex: index,
            status: 'pending',
            progress: 0,
            retries: 0,
          }))
        );

        // Determine safe content type (iOS often leaves File.type empty)
        const getSafeVideoContentType = (name: string, type: string): string => {
          if (type && type !== '') return type.toLowerCase();
          const ext = name.split('.').pop()?.toLowerCase() || '';
          const map: Record<string, string> = {
            mov: 'video/quicktime',
            mp4: 'video/mp4',
            m4v: 'video/x-m4v',
            webm: 'video/webm',
            '3gp': 'video/3gpp',
            '3gpp': 'video/3gpp',
            '3g2': 'video/3gpp2',
            '3gpp2': 'video/3gpp2',
          };
          return map[ext] || (type && type.startsWith('video/') ? type : 'video/mp4');
        };
        const safeContentType = getSafeVideoContentType(file.name, file.type);

        // Start multipart upload
        console.log('Starting multipart upload:', {
          filename: file.name,
          contentType: safeContentType,
          file_size: file.size,
          chunkCount: chunks.length,
          gallerySlug,
        });

        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          'start-multipart-upload',
          {
            body: {
              gallerySlug,
              filename: file.name,
              contentType: safeContentType,
              file_size: file.size,
              chunkCount: chunks.length,
            },
          }
        );
        
        console.log('🟢 start-multipart-upload RESPONSE', {
          timestamp: new Date().toISOString(),
          hasError: !!sessionError,
          error: sessionError ? {
            message: sessionError.message,
            status: sessionError.status,
          } : null,
          data: sessionData ? {
            sessionId: sessionData.session_id,
            galleryId: sessionData.gallery_id,
            chunkUrlsCount: sessionData.chunk_urls?.length,
          } : null,
        });

        if (sessionError || !sessionData) {
          console.error('Failed to start multipart upload:', {
            error: sessionError,
            status: sessionError?.status,
            message: sessionError?.message,
            request: {
              gallerySlug,
              filename: file.name,
              contentType: safeContentType,
              file_size: file.size,
              chunkCount: chunks.length,
            }
          });
          
          // Parse error message
          let errorMessage = sessionError?.message || 'Failed to start upload';
          if (sessionError?.status === 400) {
            errorMessage = `Upload request invalid: ${sessionError.message}. Please try again or contact support.`;
          }
          
          throw new Error(errorMessage);
        }

        const { session_id, gallery_id, chunk_urls } = sessionData;

        // Upload chunks sequentially for stable progress tracking
        const results: boolean[] = [];
        for (let index = 0; index < chunks.length; index++) {
          const chunk = chunks[index];
          const chunkUrl = chunk_urls[index];
          const success = await uploadChunk(chunk, index, chunkUrl.path, chunkUrl.token);
          results.push(success);
          
          if (!success) {
            throw new Error(`Chunk ${index + 1} failed after retries`);
          }
        }

        const allSuccess = results.every((r) => r);

        if (!allSuccess) {
          throw new Error('Some chunks failed to upload');
        }

        // Complete multipart upload
        const uploadedParts = chunk_urls.map((_: any, index: number) => ({
          chunk_index: index,
        }));

        const { data: completeData, error: completeError } = await supabase.functions.invoke(
          'complete-multipart-upload',
          {
            body: {
              session_id,
              gallery_id,
              uploaded_parts: uploadedParts,
              caption: caption || null,
            },
          }
        );
        
        console.log('🟢 complete-multipart-upload RESPONSE', {
          timestamp: new Date().toISOString(),
          hasError: !!completeError,
          error: completeError?.message,
          data: completeData ? {
            mediaId: completeData.media_id,
          } : null,
        });

        if (completeError || !completeData) {
          throw new Error(completeError?.message || 'Failed to complete upload');
        }

        setStatus('completed');
        onComplete?.(completeData.media_id);
        
        console.log('🔵 useChunkedUpload.uploadFile() END - SUCCESS', {
          timestamp: new Date().toISOString(),
          mediaId: completeData.media_id,
        });
        
        return completeData.media_id;
      } catch (error: any) {
        console.error('🔵 useChunkedUpload.uploadFile() END - FAILED', {
          timestamp: new Date().toISOString(),
          error: {
            message: error.message,
            stack: error.stack,
          },
          filename: file.name,
        });
        
        setStatus('error');
        const errorMessage = error.message || 'Upload failed';
        onError?.(errorMessage);
        return null;
      }
    },
    [gallerySlug, uploadChunk, onComplete, onError]
  );

  const cancelUpload = useCallback(() => {
    abortController.current?.abort();
    setStatus('idle');
    setChunkProgresses([]);
    setOverallProgress(0);
  }, []);

  const pauseUpload = useCallback(() => {
    isPaused.current = true;
    setStatus('paused');
  }, []);

  const resumeUpload = useCallback(() => {
    isPaused.current = false;
    setStatus('uploading');
  }, []);

  const retryFailedChunks = useCallback(async () => {
    const failedIndices = chunkProgresses
      .filter((c) => c.status === 'error')
      .map((c) => c.chunkIndex);

    if (failedIndices.length === 0) return;

    setStatus('uploading');
    // Reset failed chunks to pending
    failedIndices.forEach((index) => {
      updateChunkProgress(index, { status: 'pending', error: undefined, retries: 0 });
    });
  }, [chunkProgresses, updateChunkProgress]);

  return {
    uploadFile,
    cancelUpload,
    pauseUpload,
    resumeUpload,
    retryFailedChunks,
    chunkProgresses,
    overallProgress,
    status,
  };
};
