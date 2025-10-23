interface RecommendationsNoticeProps {
  recommendations: any;
}

export const RecommendationsNotice = ({ recommendations }: RecommendationsNoticeProps) => {
  if (!recommendations) return null;
  
  const hasRows = recommendations?.default_rows?.length > 0;
  const hasHelperText = recommendations?.helper_text;
  
  if (!hasRows && !hasHelperText) return null;

  const getDisplayText = () => {
    const rows = recommendations.default_rows;
    if (rows.length <= 3) {
      return rows.map((row: any) => row.name || row.moment || row.group || row.announcement).filter(Boolean).join(', ');
    }
    return `${rows.length} recommended entries`;
  };

  return (
    <div className="bg-[#6D28D9]/5 border-l-4 border-[#6D28D9] p-3 mb-4">
      {hasRows && (
        <>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Recommended:</strong> {getDisplayText()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Feel free to edit, reorder, or remove any of these entries.
          </p>
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
