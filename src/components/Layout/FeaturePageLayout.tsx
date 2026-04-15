import React from 'react';
import { Header } from '@/components/Layout/Header';
import { EmbeddedSignUpForm } from '@/components/auth/EmbeddedSignUpForm';
import { CookieBanner } from '@/components/ui/CookieBanner';

interface FeaturePageLayoutProps {
  title: string;
  description?: string;
}

export const FeaturePageLayout: React.FC<FeaturePageLayoutProps> = ({ title, description }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#faf8f5] to-[#f3efe9]">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-20">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Left: Content */}
          <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-lg text-gray-500 leading-relaxed">{description}</p>
            )}
          </div>

          {/* Right: Sign-up form */}
          <div className="flex justify-center md:justify-end">
            <EmbeddedSignUpForm />
          </div>
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
