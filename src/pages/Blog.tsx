import { Link } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { SeoHead } from '@/components/SEO/SeoHead';
import { BLOG_POSTS } from '@/content/blogPosts';
import blogQrScanning from '@/assets/blog-qr-scanning.jpg';
import blogPlanningLaptop from '@/assets/blog-planning-laptop.jpg';
import blogWeddingSignage from '@/assets/blog-wedding-signage.jpg';
import blogOlderGuest from '@/assets/blog-older-guest.jpg';
import blogLastMinuteChanges from '@/assets/blog-last-minute-changes.jpg';
import blogRunningSheet from '@/assets/blog-running-sheet.jpg';

const BLOG_COVER_IMAGES: Record<string, string> = {
  'blog-qr-scanning': blogQrScanning,
  'blog-planning-laptop': blogPlanningLaptop,
  'blog-wedding-signage': blogWeddingSignage,
  'blog-older-guest': blogOlderGuest,
  'blog-last-minute-changes': blogLastMinuteChanges,
  'blog-running-sheet': blogRunningSheet,
};

export const Blog = () => {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: BLOG_POSTS.map((post, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://weddingwaitress.com/blog/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <SeoHead
        title="Wedding Planning Tips & Ideas | Wedding Waitress Blog"
        description="Discover wedding planning tips, seating chart ideas, and guest management advice for your big day."
        jsonLd={itemListJsonLd}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="w-full bg-[#f3efe9] pt-24 pb-14 md:pt-32 md:pb-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1D1D1F] leading-tight whitespace-nowrap">
              Wedding Tips &amp; Ideas
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#6E6E73] leading-relaxed max-w-2xl mx-auto">
              Helpful guides, tips, and ideas to make planning your wedding or event simple and stress-free.
            </p>
          </div>
        </section>

        {/* Posts grid */}
        <section className="w-full max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.slug}
                className="bg-white rounded-2xl border border-[#eee5d8] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                <Link
                  to={`/blog/${post.slug}`}
                  onClick={() => window.scrollTo(0, 0)}
                  className="block aspect-[16/9] overflow-hidden bg-[#f3efe9]"
                >
                  {post.coverImage && BLOG_COVER_IMAGES[post.coverImage] ? (
                    <img
                      src={BLOG_COVER_IMAGES[post.coverImage]}
                      alt={post.title}
                      loading="lazy"
                      width={1024}
                      height={576}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#f3efe9] to-[#e8dfcf] flex items-center justify-center text-6xl">
                      <span aria-hidden="true">{post.coverEmoji}</span>
                    </div>
                  )}
                </Link>
                <div className="p-6 flex flex-col flex-1">
                  <div className="text-xs uppercase tracking-wider text-[#967A59] font-semibold mb-2">
                    {post.readingTime}
                  </div>
                  <h2 className="text-xl font-bold text-[#1D1D1F] mb-3 leading-snug">
                    <Link
                      to={`/blog/${post.slug}`}
                      onClick={() => window.scrollTo(0, 0)}
                      className="hover:text-[#967A59] transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-[#6E6E73] leading-relaxed flex-1">{post.excerpt}</p>
                  <Link
                    to={`/blog/${post.slug}`}
                    onClick={() => window.scrollTo(0, 0)}
                    className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#967A59] text-white font-semibold text-sm hover:bg-[#7a6347] transition-colors w-fit"
                  >
                    Read More →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#1D1D1F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center text-sm text-white/60">
          © {new Date().getFullYear()} Wedding Waitress. All rights reserved.
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
};
