import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SignUpModal } from './SignUpModal';

interface AuthGatedCtaLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * CTA that links to a protected route (e.g. /dashboard) ONLY when the user
 * is authenticated. For logged-out users it opens the existing SignUpModal —
 * preventing any unauthenticated bypass to the dashboard.
 *
 * Behaviour:
 *  - Logged out  → click opens "Create your free account" popup
 *  - Logged in   → click navigates to `to` (e.g. /dashboard)
 *
 * Auth state is verified on click (not just on mount) to avoid any stale
 * state allowing logged-out users to slip through to /dashboard.
 */
export const AuthGatedCtaLink: React.FC<AuthGatedCtaLinkProps> = ({
  to,
  className,
  children,
  onClick,
}) => {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [signUpOpen, setSignUpOpen] = useState(false);

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
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onClick?.();
      // Re-verify auth at click time to eliminate stale-state bypass.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.scrollTo(0, 0);
        navigate(to);
      } else {
        setIsAuthed(false);
        setSignUpOpen(true);
      }
    },
    [navigate, onClick, to]
  );

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        {children}
      </button>
      {/* Controlled SignUpModal — opened only for unauthenticated clicks. */}
      <SignUpModal open={signUpOpen} onOpenChange={setSignUpOpen}>
        <span style={{ display: 'none' }} />
      </SignUpModal>
    </>
  );
};
