import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SignUpModal } from './SignUpModal';

interface AuthGatedCtaLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * CTA that links to a protected route (e.g. /dashboard) only when the user
 * is authenticated. Otherwise it opens the SignUp modal — preventing any
 * unauthenticated bypass to the dashboard.
 */
export const AuthGatedCtaLink: React.FC<AuthGatedCtaLinkProps> = ({
  to,
  className,
  children,
  onClick,
}) => {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

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

  // While loading auth state, render a non-navigating button to avoid bypass.
  if (isAuthed) {
    return (
      <Link
        to={to}
        onClick={() => {
          window.scrollTo(0, 0);
          onClick?.();
        }}
        className={className}
      >
        {children}
      </Link>
    );
  }

  return (
    <SignUpModal>
      <button type="button" className={className} onClick={onClick}>
        {children}
      </button>
    </SignUpModal>
  );
};
