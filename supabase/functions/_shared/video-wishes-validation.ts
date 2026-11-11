/** Processor output is fetched server-to-server, never accepted from the browser. */
export function validateProcessedWish(video: any, maxSeconds: number): 'pending' | 'valid' {
  if(video?.requireSignedURLs !== true) throw new Error('PROCESSOR_PRIVACY');
  if(video.status?.state === 'error') throw new Error('INVALID_VIDEO');
  if(video.readyToStream !== true) return 'pending';
  if(!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > maxSeconds) throw new Error('VIDEO_TOO_LONG');
  if(!(video.input?.width > 0 && video.input?.height > 0)) throw new Error('INVALID_VIDEO');
  return 'valid';
}

export function validateStoredWish(bytes: number, expectedBytes: number, maxBytes: number, prefix: Uint8Array, mime: string) {
  if(!Number.isSafeInteger(bytes) || bytes<1 || bytes !== expectedBytes || bytes>maxBytes) throw new Error('VIDEO_TOO_LARGE');
  const mp4=prefix.length>=12 && String.fromCharCode(...prefix.slice(4,8))==='ftyp';
  const webm=prefix.length>=4 && prefix[0]===0x1a && prefix[1]===0x45 && prefix[2]===0xdf && prefix[3]===0xa3;
  if(!((mime==='video/mp4'||mime==='video/quicktime')?mp4:mime==='video/webm'&&webm)) throw new Error('INVALID_VIDEO');
}
