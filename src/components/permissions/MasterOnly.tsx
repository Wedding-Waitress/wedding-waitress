import React from 'react';
import { useAccountRole } from '@/hooks/useAccountRole';
import { LockedTooltip } from './LockedTooltip';

interface Props {
  children: React.ReactElement;
  /** When 'hide', non-masters see nothing. When 'disable' (default), button renders disabled with tooltip. */
  fallback?: 'hide' | 'disable';
  reason?: string;
}

/**
 * Gates a single interactive child to Master account holders.
 * - fallback='disable' (default): clones child with `disabled` + wraps in LockedTooltip.
 * - fallback='hide': renders nothing for standard users.
 */
export const MasterOnly: React.FC<Props> = ({ children, fallback = 'disable', reason }) => {
  const { isMaster, loading } = useAccountRole();
  if (loading) return children;
  if (isMaster) return children;
  if (fallback === 'hide') return null;

  const disabled = React.cloneElement(children as any, {
    disabled: true,
    onClick: (e: React.MouseEvent) => e.preventDefault(),
    'aria-disabled': true,
  });

  return <LockedTooltip reason={reason}>{disabled}</LockedTooltip>;
};
