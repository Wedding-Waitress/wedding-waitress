import { useTranslation } from 'react-i18next';

export interface BlogPostSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPostLink {
  label: string;
  href: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  date: string;
  readingTime: string;
  coverEmoji: string;
  coverImage?: string;
  intro: string;
  sections: BlogPostSection[];
  internalLinks: BlogPostLink[];
}

// Static metadata: slugs, dates, emojis, cover images, and internal links structure.
// All translatable text comes from i18n/locales/{lang}/landing.json under the "blog.posts" key.
interface BlogPostStatic {
  slug: string;
  date: string;
  coverEmoji: string;
  coverImage?: string;
  internalLinks: BlogPostLink[];
}

const BLOG_POSTS_STATIC: BlogPostStatic[] = [
  {
    slug: 'qr-code-wedding-seating-chart-australia',
    date: '2026-04-17',
    coverEmoji: '📱',
    coverImage: 'blog-qr-scanning',
    internalLinks: [
      { label: 'QR Code Seating Chart', href: '/products/qr-code-seating-chart' },
      { label: 'Wedding Guest List Manager', href: '/products/guest-list' },
      { label: 'Tables & Seating', href: '/products/tables' },
      { label: 'Compare printed vs digital wedding signage costs', href: '/blog/wedding-signage-cost-australia' },
      { label: 'How to create a QR code seating chart in 5 minutes', href: '/blog/how-to-create-qr-code-seating-chart' },
    ],
  },
  {
    slug: 'wedding-signage-cost-australia',
    date: '2026-04-15',
    coverEmoji: '💰',
    coverImage: 'blog-wedding-signage',
    internalLinks: [
      { label: 'QR Code Seating Chart', href: '/products/qr-code-seating-chart' },
      { label: 'Name Place Cards', href: '/products/name-place-cards' },
      { label: 'Why couples are switching to QR code seating in 2026', href: '/blog/qr-code-wedding-seating-chart-australia' },
      { label: 'How to handle last-minute seating changes', href: '/blog/last-minute-wedding-seating-changes' },
    ],
  },
  {
    slug: 'how-to-create-qr-code-seating-chart',
    date: '2026-04-16',
    coverEmoji: '✨',
    coverImage: 'blog-planning-laptop',
    internalLinks: [
      { label: 'Tables & Seating', href: '/products/tables' },
      { label: 'Guest List Manager', href: '/products/guest-list' },
      { label: 'QR Code Seating Chart', href: '/products/qr-code-seating-chart' },
      { label: 'Are digital seating charts easy for older guests?', href: '/blog/digital-wedding-seating-chart-accessibility' },
    ],
  },
  {
    slug: 'digital-wedding-seating-chart-accessibility',
    date: '2026-04-06',
    coverEmoji: '👵',
    coverImage: 'blog-older-guest',
    internalLinks: [
      { label: 'Full Seating Chart (printed backup)', href: '/products/full-seating-chart' },
      { label: 'QR Code Seating Chart', href: '/products/qr-code-seating-chart' },
      { label: 'How to create a QR code seating chart in 5 minutes', href: '/blog/how-to-create-qr-code-seating-chart' },
    ],
  },
  {
    slug: 'last-minute-wedding-seating-changes',
    date: '2026-04-04',
    coverEmoji: '⚡',
    coverImage: 'blog-last-minute-changes',
    internalLinks: [
      { label: 'QR Code Seating Chart', href: '/products/qr-code-seating-chart' },
      { label: 'Guest List Manager', href: '/products/guest-list' },
      { label: 'Printed vs digital seating chart costs', href: '/blog/wedding-signage-cost-australia' },
    ],
  },
  {
    slug: 'why-every-wedding-needs-a-running-sheet',
    date: '2026-04-17',
    coverEmoji: '🗓️',
    coverImage: 'blog-running-sheet',
    internalLinks: [
      { label: 'Running Sheet', href: '/products/running-sheet' },
      { label: 'DJ & MC Questionnaire', href: '/products/dj-mc-questionnaire' },
      { label: 'My Events', href: '/products/my-events' },
    ],
  },
];

/**
 * Returns localized blog posts. Reads translatable fields from i18n
 * (`landing.blog.posts.<slug>`) and merges with static structural metadata.
 */
export const useBlogPosts = (): BlogPost[] => {
  const { t } = useTranslation('landing');

  return BLOG_POSTS_STATIC.map((stat) => {
    const base = `blog.posts.${stat.slug}`;
    const sections = (t(`${base}.sections`, { returnObjects: true }) as BlogPostSection[]) || [];
    return {
      slug: stat.slug,
      date: stat.date,
      coverEmoji: stat.coverEmoji,
      coverImage: stat.coverImage,
      internalLinks: stat.internalLinks,
      title: t(`${base}.title`),
      metaTitle: t(`${base}.metaTitle`),
      metaDescription: t(`${base}.metaDescription`),
      excerpt: t(`${base}.excerpt`),
      readingTime: t(`${base}.readingTime`),
      intro: t(`${base}.intro`),
      sections: Array.isArray(sections) ? sections : [],
    };
  });
};

export const useBlogPostBySlug = (slug: string | undefined): BlogPost | undefined => {
  const posts = useBlogPosts();
  if (!slug) return undefined;
  return posts.find((p) => p.slug === slug);
};

// Backwards-compat: a static English fallback list (no translations).
// Prefer useBlogPosts() in components. Keeping this export prevents breaking
// any non-component imports.
export const BLOG_POSTS: BlogPost[] = BLOG_POSTS_STATIC.map((s) => ({
  ...s,
  title: '',
  metaTitle: '',
  metaDescription: '',
  excerpt: '',
  readingTime: '',
  intro: '',
  sections: [],
}));

export const getBlogPostBySlug = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((p) => p.slug === slug);
