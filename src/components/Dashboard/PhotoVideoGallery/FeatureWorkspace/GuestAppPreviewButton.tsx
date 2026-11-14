import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/enhanced-button';
import { buildGalleryGuestAppUrl } from '@/lib/urlUtils';
import managementStyles from '../photoVideoSharingManagement.module.css';

/** The same guest-app preview action in every Guest Experience workspace. */
export const GuestAppPreviewButton: React.FC<{ token?: string | null }> = ({ token }) => {
  const url = buildGalleryGuestAppUrl(token);
  return (
    <Button variant="outline"
      className={`lv-premium-shade text-white border ${managementStyles.glassAction} ${managementStyles.workspaceHeaderAction}`}
      disabled={!url}
      onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
    >
      <ExternalLink className="h-4 w-4 mr-1" strokeWidth={1.8} /> Preview as Guest
    </Button>
  );
};
