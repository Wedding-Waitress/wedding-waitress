import React from 'react';
import { Switch } from '@/components/ui/switch';

export function ModuleVisibilityControl({ label, enabled, failed = false, onChange, onRetry, className = '' }: {
  label: string;
  enabled: boolean | undefined;
  failed?: boolean;
  onChange: (enabled: boolean) => void;
  onRetry?: () => void;
  className?: string;
}) {
  return <div className={`flex items-center gap-2 max-lg:justify-between ${className}`}>
    {enabled === undefined ? <span role={failed ? 'alert' : 'status'} className="text-xs text-muted-foreground">
      {failed ? 'Settings could not be loaded.' : 'Loading saved settings...'}
    </span> : <>
      <span className={`text-xs whitespace-nowrap ${enabled ? 'text-green-600' : 'text-red-500'}`}>
        {enabled ? 'Displayed on app' : 'Not displayed on app'}
      </span>
      <Switch aria-label={`Display ${label} on app`} checked={enabled} onCheckedChange={onChange}
        className="data-[state=checked]:bg-success data-[state=unchecked]:border data-[state=unchecked]:border-[#967A59]/70" />
    </>}
    {failed && <span className="text-xs" role="alert">
      {enabled !== undefined && 'Saved settings could not be refreshed. '}
      {onRetry && <button type="button" className="underline" onClick={onRetry}>Try again</button>}
    </span>}
  </div>;
}
