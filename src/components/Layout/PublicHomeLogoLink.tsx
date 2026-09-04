import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { scrollPageToTop } from '@/lib/pageScroll';

interface PublicHomeLogoLinkProps {
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
}

export const PublicHomeLogoLink: React.FC<PublicHomeLogoLinkProps> = ({
  children,
  className = '',
  onNavigate,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate?.();

    const isPlainHomepage = location.pathname === '/' && !location.search && !location.hash;
    if (isPlainHomepage) {
      scrollPageToTop();
      return;
    }

    navigate('/');
    requestAnimationFrame(() => {
      scrollPageToTop();
      requestAnimationFrame(scrollPageToTop);
    });
  };

  return (
    <Link
      to="/"
      onClick={handleClick}
      aria-label="Wedding Waitress home"
      className={`ww-public-home-logo ww-focus ${className}`.trim()}
    >
      {children}
    </Link>
  );
};
