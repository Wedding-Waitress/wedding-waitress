import React from 'react';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';

export const GuestbookList: React.FC<{ items: GalleryItem[] }> = ({ items }) => {
  const messages = items.filter(i => i.guestbook_message && i.guestbook_message.trim().length > 0);
  if (messages.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-[#1D1D1F] mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-[#967A59]" /> Guestbook messages ({messages.length})
      </h2>
      <ul className="space-y-3">
        {messages.map(m => (
          <li key={m.id} className="border border-border rounded-lg p-3 bg-[#FBF8F3]">
            <p className="text-sm text-[#1D1D1F] whitespace-pre-wrap">{m.guestbook_message}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              — {m.uploader_name || 'Anonymous guest'}
              {m.uploaded_at && ` • ${new Date(m.uploaded_at).toLocaleDateString()}`}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
};
