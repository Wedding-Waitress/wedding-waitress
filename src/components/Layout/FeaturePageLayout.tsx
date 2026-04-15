import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { EmbeddedSignUpForm } from '@/components/auth/EmbeddedSignUpForm';
import { CookieBanner } from '@/components/ui/CookieBanner';

interface FeaturePageLayoutProps {
  title: string;
  description?: string;
  backgroundImage?: string;
}

export const FeaturePageLayout: React.FC<FeaturePageLayoutProps> = ({ title, description, backgroundImage }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <Header />

      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left: Visual + Content */}
        <div
          className="relative w-full md:w-1/2 min-h-[340px] md:min-h-0 flex items-center justify-center"
          style={{
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: backgroundImage ? undefined : '#967A59',
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Content */}
          <div className="relative z-10 text-center px-8 py-16 md:py-0 max-w-lg">
            <Link
              to="/"
              onClick={() => window.scrollTo(0, 0)}
              className="inline-block mb-6 text-sm text-gray-300 hover:text-[#967A59] transition-colors"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
              {title}
            </h1>
            {description && (
              <p className="mt-5 text-base sm:text-lg text-white/90 leading-relaxed drop-shadow-md">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Sign-up form */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-[#f3efe9] px-6 py-12 md:py-0">
          <EmbeddedSignUpForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} Wedding Waitress. All rights reserved.
      </footer>
      <CookieBanner />
    </div>
  );
};
