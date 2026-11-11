/** Fail closed before signing URLs, including when the database is still an older version. */
export function isGeneralGalleryItem(row: {
 source_category?: string | null; is_guestbook?: boolean | null; kind?: string;
}): boolean {
 return ['guest_upload','photo_booth','guestbook_recording'].includes(row.source_category || '') &&
   (row.kind === 'photo' || row.kind === 'video' || (row.kind === 'audio' && row.source_category === 'guestbook_recording'));
}
