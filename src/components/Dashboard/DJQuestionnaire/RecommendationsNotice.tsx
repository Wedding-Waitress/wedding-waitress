import { Button } from '@/components/ui/button';

interface RecommendationsNoticeProps {
  recommendations: any;
  onApply?: () => void;
  currentItemCount?: number;
}

export const RecommendationsNotice = ({ 
  recommendations, 
  onApply,
  currentItemCount = 0
}: RecommendationsNoticeProps) => {
  if (!recommendations) return null;
  
  const hasRows = recommendations?.default_rows?.length > 0;
  const hasHelperText = recommendations?.helper_text;
  
  if (!hasRows && !hasHelperText) return null;

  const getDisplayText = () => {
    const rows = recommendations.default_rows;
    if (rows.length <= 3) {
      return rows.map((row: any) => row.name || row.moment || row.role || row.group || row.announcement).filter(Boolean).join(', ');
    }
    return `${rows.length} recommended entries`;
  };

  const recommendedCount = recommendations.default_rows?.length || 0;
  const showApplyButton = hasRows && onApply && currentItemCount === 0;

  return (
    <div className="bg-[#6D28D9]/5 border-l-4 border-[#6D28D9] p-3 mb-4">
      {hasRows && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Recommended: {recommendedCount} {recommendedCount === 1 ? 'entry' : 'entries'}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {showApplyButton ? 'Click "Apply" to add these entries, then edit as needed.' : 'Feel free to edit, reorder, or remove any entries.'}
              </p>
            </div>
            {showApplyButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onApply}
                className="text-[#6D28D9] border-[#6D28D9] hover:bg-[#6D28D9]/10 shrink-0"
              >
                Apply
              </Button>
            )}
          </div>
        </>
      )}
      
      {hasHelperText && (
        <p className={`text-xs text-muted-foreground ${hasRows ? 'mt-2 pt-2 border-t border-[#6D28D9]/20' : ''}`}>
          💡 <strong>Pro tip:</strong> {recommendations.helper_text}
        </p>
      )}
    </div>
  );
};
