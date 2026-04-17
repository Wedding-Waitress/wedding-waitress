import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { SeoHead } from '@/components/SEO/SeoHead';
import { BLOG_POSTS, getBlogPostBySlug } from '@/content/blogPosts';
import NotFound from '@/pages/NotFound';

export const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) return <NotFound />;

  const url = `https://weddingwaitress.com/blog/${post.slug}`;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Wedding Waitress' },
    publisher: {
      '@type': 'Organization',
      name: 'Wedding Waitress',
      logo: {
        '@type': 'ImageObject',
        url: 'https://weddingwaitress.com/wedding-waitress-logo.png',
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://weddingwaitress.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://weddingwaitress.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <SeoHead
        title={post.metaTitle}
        description={post.metaDescription}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />
      <Header />

      <main className="flex-1">
        <article className="w-full max-w-3xl mx-auto px-6 pt-16 md:pt-24 pb-16">
          <nav className="text-sm text-[#6E6E73] mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#967A59]">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/blog" className="hover:text-[#967A59]">Blog</Link>
          </nav>

          <div className="text-xs uppercase tracking-wider text-[#967A59] font-semibold mb-3">
            {post.readingTime}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1D1D1F] leading-tight">
            {post.title}
          </h1>
          <p className="mt-6 text-lg text-[#6E6E73] leading-relaxed">{post.intro}</p>

          <div className="mt-10 space-y-10">
            {post.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] mb-4">
                  {section.heading}
                </h2>
                {section.paragraphs.map((p, j) => (
                  <p key={j} className="text-base md:text-lg text-[#3a3a3c] leading-relaxed mb-4">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          {/* Internal links */}
          <aside className="mt-12 bg-white rounded-2xl border border-[#eee5d8] p-6 md:p-8">
            <h2 className="text-xl font-bold text-[#1D1D1F] mb-4">Related tools</h2>
            <ul className="space-y-2">
              {post.internalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    onClick={() => window.scrollTo(0, 0)}
                    className="text-[#967A59] font-semibold hover:underline"
                  >
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          {/* CTA */}
          <div className="mt-12 text-center bg-[#967A59] rounded-2xl p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to plan your wedding?
            </h2>
            <p className="text-white/90 mb-6">
              Try Wedding Waitress free and bring all of these tools into one place.
            </p>
            <Link
              to="/dashboard"
              onClick={() => window.scrollTo(0, 0)}
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#967A59] font-semibold text-base hover:bg-[#faf8f5] transition-colors shadow-sm"
            >
              Start Planning Your Event
            </Link>
          </div>
        </article>

        {/* Related posts */}
        {related.length > 0 && (
          <section className="w-full bg-white border-t border-[#eee5d8] py-14">
            <div className="max-w-5xl mx-auto px-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] mb-8 text-center">
                Keep reading
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    onClick={() => window.scrollTo(0, 0)}
                    className="block bg-[#faf8f5] rounded-2xl p-6 border border-[#eee5d8] hover:border-[#967A59] hover:shadow-md transition-all"
                  >
                    <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">{p.title}</h3>
                    <p className="text-sm text-[#6E6E73] leading-relaxed">{p.excerpt}</p>
                    <span className="mt-3 inline-block text-sm font-semibold text-[#967A59]">
                      Read more →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
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
