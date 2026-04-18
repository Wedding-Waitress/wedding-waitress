import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SignUpModal } from './SignUpModal';

interface AuthGatedCtaLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  /**
   * When true, do not render a wrapper <button>. Instead, clone the single
   * child element and inject the auth-gated click handler. Use this to
   * preserve existing Button JSX/styling exactly (e.g. Landing hero, Header).
   */
  asChild?: boolean;
}

/**
 * CTA that links to a protected route (e.g. /dashboard) ONLY when the user
 * is authenticated. For logged-out users it opens the existing SignUpModal —
 * preventing any unauthenticated bypass to the dashboard.
 *
 * Auth state is re-verified at click time (not just on mount) so stale state
 * cannot let logged-out users slip through to /dashboard.
 */
export const AuthGatedCtaLink: React.FC<AuthGatedCtaLinkProps> = ({
  to,
  className,
  children,
  onClick,
  asChild = false,
}) => {
  const navigate = useNavigate();
  const [, setIsAuthed] = useState<boolean>(false);
  const hiddenTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setIsAuthed(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setIsAuthed(!!session);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.();
      // Re-verify auth at click time — eliminates any stale-state bypass.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.scrollTo(0, 0);
        navigate(to);
      } else {
        setIsAuthed(false);
        // Programmatically open the existing SignUpModal via its hidden trigger.
        hiddenTriggerRef.current?.click();
      }
    },
    [navigate, onClick, to]
  );

  const hiddenTrigger = (
    <SignUpModal>
      <button
        ref={hiddenTriggerRef}
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: 'absolute', width: 0, height: 0, padding: 0, margin: 0, border: 0, opacity: 0, pointerEvents: 'none' }}
      />
    </SignUpModal>
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    const cloned = React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        if (!e.defaultPrevented) handleClick(e);
      },
    });
    return (
      <>
        {cloned}
        {hiddenTrigger}
      </>
    );
  }

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        {children}
      </button>
      {hiddenTrigger}
    </>
  );
};
