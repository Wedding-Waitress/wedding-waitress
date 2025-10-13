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
      uploadUrl: string,
      token: string
    ): Promise<boolean> => {
      let retries = 0;

      while (retries < MAX_RETRIES_PER_CHUNK) {
        if (isPaused.current) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        try {
          updateChunkProgress(chunkIndex, { status: 'uploading', retries });

          const xhr = new XMLHttpRequest();
          const uploadPromise = new Promise<void>((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 100;
                updateChunkProgress(chunkIndex, { progress });
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error')));
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(chunk);
          });

          if (abortController.current) {
            abortController.current.signal.addEventListener('abort', () => xhr.abort());
          }

          await uploadPromise;
          updateChunkProgress(chunkIndex, { status: 'success', progress: 100 });
          return true;
        } catch (error: any) {
          retries++;
          const errorMessage = error.message || 'Unknown error';
          console.error(`Chunk ${chunkIndex} upload failed (attempt ${retries}):`, errorMessage);

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

      return false;
    },
    [updateChunkProgress]
  );

  const uploadFile = useCallback(
    async (file: File, caption?: string): Promise<string | null> => {
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

        // Start multipart upload
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          'start-multipart-upload',
          {
            body: {
              gallerySlug,
              filename: file.name,
              contentType: file.type,
              file_size: file.size,
              chunkCount: chunks.length,
            },
          }
        );

        if (sessionError || !sessionData) {
          throw new Error(sessionError?.message || 'Failed to start upload');
        }

        const { session_id, gallery_id, chunk_urls } = sessionData;

        // Upload all chunks
        const uploadPromises = chunks.map((chunk, index) => {
          const chunkUrl = chunk_urls[index];
          return uploadChunk(chunk, index, chunkUrl.upload_url, chunkUrl.token);
        });

        const results = await Promise.all(uploadPromises);
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

        if (completeError || !completeData) {
          throw new Error(completeError?.message || 'Failed to complete upload');
        }

        setStatus('completed');
        onComplete?.(completeData.media_id);
        return completeData.media_id;
      } catch (error: any) {
        console.error('Upload failed:', error);
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
