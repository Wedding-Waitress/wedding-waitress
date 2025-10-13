import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Share2, Download, Loader2 } from 'lucide-react';
import { useGalleryAnalytics } from '@/hooks/useGalleryAnalytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GalleryAnalyticsWidgetProps {
  galleryId: string | null;
}

export const GalleryAnalyticsWidget: React.FC<GalleryAnalyticsWidgetProps> = ({ galleryId }) => {
  const { analytics, loading } = useGalleryAnalytics(galleryId);

  if (!galleryId) return null;

  return (
    <Card className="ww-box border-2 border-primary/20">
      <CardContent className="py-2 px-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <TooltipProvider>
            <div className="flex items-center justify-between gap-6">
              <h3 className="text-lg font-semibold whitespace-nowrap">Album Insights</h3>
              <div className="flex items-center justify-around gap-6 flex-1">
              {/* Views */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center cursor-help">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <Eye className="w-5 h-5" />
                      <span className="text-2xl font-bold">
                        {analytics?.unique_sessions || 0}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Views</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Unique guests who opened your album link</p>
                </TooltipContent>
              </Tooltip>

              {/* Shares */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center cursor-help">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <Share2 className="w-5 h-5" />
                      <span className="text-2xl font-bold">
                        {analytics?.total_shares || 0}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Shares</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Times guests used Share Album</p>
                </TooltipContent>
              </Tooltip>

              {/* Downloads */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center cursor-help">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <Download className="w-5 h-5" />
                      <span className="text-2xl font-bold">
                        {analytics?.total_downloads || 0}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Downloads</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total files downloaded by guests</p>
                </TooltipContent>
              </Tooltip>
            </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
};
