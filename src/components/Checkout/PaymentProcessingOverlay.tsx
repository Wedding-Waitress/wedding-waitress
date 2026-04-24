import React from 'react';

interface Props {
  title?: string;
  subtitle?: string;
}

/**
 * Full-screen branded loading overlay shown the instant a user clicks Pay,
 * through Stripe processing, redirect, and verification on the success page.
 * Renders synchronously (no transitions delayed by JS) so the user never
 * sees a blank white screen between checkout and success.
 */
export const PaymentProcessingOverlay: React.FC<Props> = ({
  title = 'Processing your payment...',
  subtitle = 'This will only take a few seconds',
}) => {
  return (
    <div
      className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-gradient-to-b from-[#FBF9F4] to-[#F4EDE0]"
      role="status"
      aria-live="polite"
    >
      {/* Fixed-size container prevents layout shift / size change between states */}
      <div
        className="relative mb-8 flex items-center justify-center"
        style={{ width: 140, height: 140 }}
      >
        <div
          className="absolute inset-0 rounded-full border-2 border-[#E8E1D6] border-t-[#967A59]"
          style={{
            animation: 'payment-spin 1s linear infinite',
            willChange: 'transform',
          }}
        />
        <img
          src="/wedding-waitress-logo-full.png"
          alt="Wedding Waitress"
          className="relative"
          style={{ height: 64, width: 'auto' }}
        />
      </div>

      <h1 className="text-lg sm:text-xl font-semibold text-foreground text-center px-6">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground text-center px-6">
        {subtitle}
      </p>

      <style>{`
        @keyframes payment-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentProcessingOverlay;
