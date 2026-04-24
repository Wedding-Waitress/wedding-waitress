import React from 'react';

interface Props {
  title?: string;
  subtitle?: string;
}

/**
 * Full-screen branded loading overlay shown during Stripe payment processing
 * and verification. Renders instantly to prevent the blank-screen gap between
 * Stripe redirect and our success page mounting.
 */
export const PaymentProcessingOverlay: React.FC<Props> = ({
  title = 'Processing your payment securely...',
  subtitle = 'Please do not close this page',
}) => {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-[#FBF9F4] to-[#F4EDE0] animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <img
        src="/wedding-waitress-logo-full.png"
        alt="Wedding Waitress"
        className="h-16 sm:h-20 w-auto mb-8 animate-scale-in"
      />

      {/* Animated progress bar */}
      <div className="w-64 sm:w-80 h-1.5 bg-[#E8E1D6] rounded-full overflow-hidden mb-6">
        <div
          className="h-full w-1/3 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, #967A59, transparent)',
            animation: 'payment-progress 1.4s ease-in-out infinite',
          }}
        />
      </div>

      <h1 className="text-lg sm:text-xl font-semibold text-foreground text-center px-6">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground text-center px-6">
        {subtitle}
      </p>

      <style>{`
        @keyframes payment-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default PaymentProcessingOverlay;
