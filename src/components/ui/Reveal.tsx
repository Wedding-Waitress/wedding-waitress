/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React from 'react';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'left' | 'right' | 'up';
  as?: 'div' | 'section';
  children: React.ReactNode;
}

/**
 * Wrapper that fades + slides its children into view on scroll, once.
 */
export const Reveal: React.FC<RevealProps> = ({
  direction = 'up',
  as = 'div',
  children,
  className = '',
  ...rest
}) => {
  const ref = useRevealOnScroll<HTMLDivElement>();
  const Tag = as as any;
  return (
    <Tag ref={ref} className={`reveal-${direction} ${className}`} {...rest}>
      {children}
    </Tag>
  );
};
