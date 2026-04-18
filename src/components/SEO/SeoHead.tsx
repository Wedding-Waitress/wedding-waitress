/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SeoHeadProps {
  title: string;
  description: string;
  /** Override canonical path. Defaults to current location pathname. */
  canonicalPath?: string;
  /** Absolute or root-relative image URL for OG/Twitter cards. */
  image?: string;
  /** Schema.org JSON-LD object(s) to inline. */
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** noindex — for thank-you / private pages. */
  noIndex?: boolean;
}

const SITE_URL = 'https://weddingwaitress.com';
const DEFAULT_IMAGE = `${SITE_URL}/wedding-waitress-logo.png`;

/**
 * Per-page SEO head. Renders title, meta description, canonical,
 * OpenGraph, Twitter Card, and optional JSON-LD structured data.
 *
 * Lovable hosting cannot prerender HTML, but Googlebot executes JS
 * and indexes Helmet-rendered tags within seconds — so this gives us
 * ~90% of SSG's SEO benefit with zero infra changes.
 */
export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonicalPath,
  image = DEFAULT_IMAGE,
  jsonLd,
  noIndex,
}) => {
  const location = useLocation();
  const path = canonicalPath ?? location.pathname;
  const canonicalUrl = `${SITE_URL}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  const jsonLdArray = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="Wedding Waitress" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {jsonLdArray.map((item, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
};
