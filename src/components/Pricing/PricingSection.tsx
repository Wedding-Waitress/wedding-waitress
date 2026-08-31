/**
 * Reusable pricing section — extracted verbatim from Landing.tsx.
 * Default behavior (no onPlanSelect) is IDENTICAL to the locked homepage section.
 * When onPlanSelect is provided (authenticated upgrade flow), CTAs invoke the callback
 * instead of routing through the sign-up funnel.
 */
import React from 'react';
import { CircleCheck, Crown, Zap, Heart, Building2, BadgeDollarSign, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/enhanced-button';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import { useTranslation } from 'react-i18next';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { PLAN_PRICING, VENDOR_PRICING, formatPrice } from '@/lib/currencyPricing';
import { PublicPricingSection } from './PublicPricingSection';
import { PUBLIC_COUPLE_PLAN_DETAILS, type PlanKey } from './pricingPlans';
import { PACKAGE_CHECKOUT_AVAILABLE, PACKAGE_CHECKOUT_NOTICE } from '@/lib/packagePricing';

export { PUBLIC_COUPLE_PLAN_DETAILS, type PlanKey } from './pricingPlans';

interface Props {
  onPlanSelect?: (plan: PlanKey) => void;
}

export const PricingSection: React.FC<Props> = ({ onPlanSelect }) => {
  const { t } = useTranslation('landing');
  const { currency } = useCurrencyContext();
  const plans = PLAN_PRICING[currency];
  const vendor = VENDOR_PRICING[currency];
  const ctaLabel = onPlanSelect && !PACKAGE_CHECKOUT_AVAILABLE ? 'Coming Soon' : onPlanSelect ? 'Upgrade Now' : t('pricing.getStarted');
  // Icon enhancements apply to the public homepage pricing section only.
  const publicPage = !onPlanSelect;
  if (publicPage) return <PublicPricingSection />;
  const ctaContent = publicPage ? (
    <span className="inline-flex items-center justify-center gap-2">
      {ctaLabel}
      <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
    </span>
  ) : ctaLabel;

  const renderCta = (plan: PlanKey, button: React.ReactElement) => {
    if (onPlanSelect) {
      return React.cloneElement(button, {
        onClick: () => onPlanSelect(plan),
        disabled: !PACKAGE_CHECKOUT_AVAILABLE,
        title: !PACKAGE_CHECKOUT_AVAILABLE ? PACKAGE_CHECKOUT_NOTICE : undefined,
      });
    }
    const name = plan === 'vendor_pro' ? 'Vendor Pro' : PUBLIC_COUPLE_PLAN_DETAILS[plan].name;
    return (
      <AuthGatedCtaLink to="/dashboard" asChild alwaysSignUp signUpPlan={{ key: plan, name }}>
        {button}
      </AuthGatedCtaLink>
    );
  };

  return (
    <section id="pricing" className="py-16 md:py-20 px-4 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
          <span className="inline-flex items-center justify-center gap-2 flex-wrap">
            {publicPage && <BadgeDollarSign size={24} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-primary" />}
            {t('pricing.title')}
          </span>
        </h2>
        <p className="text-lg text-gray-500 text-center mb-4 max-w-xl mx-auto">{publicPage ? 'Couple plans are one-time payments for one event and 12 months of complete platform access.' : t('pricing.subtitle')}</p>
        <p className="text-base font-medium text-primary text-center mb-4 max-w-2xl mx-auto">
          {publicPage ? '7-day free trial · Up to 20 guests · No credit card required' : t('pricing.trialNote')}
        </p>
        <p className="text-sm text-gray-500 text-center mb-2 max-w-xl mx-auto">
          {t('pricing.reassurance')}
        </p>
        <p className="text-sm text-gray-400 text-center mb-16 max-w-xl mx-auto">
          {publicPage ? 'Australian prices shown. GST is added where applicable.' : t('pricing.noHiddenFees')}
        </p>
        {!publicPage && !PACKAGE_CHECKOUT_AVAILABLE && (
          <p role="status" className="mx-auto -mt-10 mb-12 max-w-2xl rounded-xl border border-[#d7b985] bg-[#f6efe5] px-4 py-3 text-center text-sm text-[#70452f]">
            {PACKAGE_CHECKOUT_NOTICE}
          </p>
        )}

        {/* Main Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {/* Essential */}
          <div className="bg-white rounded-[20px] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={22} strokeWidth={1.8} aria-hidden="true" className="text-primary" />
              <h3 className="text-xl font-bold text-gray-900">{publicPage ? PUBLIC_COUPLE_PLAN_DETAILS.essential.name : t('pricing.essential.name')}</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-900">{formatPrice(currency, plans.essential.price)}</span>
              {!publicPage && plans.essential.originalPrice && <span className="text-gray-400 line-through text-lg">{formatPrice(currency, plans.essential.originalPrice)}</span>}
            </div>
            <p className="text-sm text-gray-500 mb-1">{publicPage ? `Up to ${PUBLIC_COUPLE_PLAN_DETAILS.essential.guests} guests · one event · 12 months` : t('pricing.essential.guests')}</p>
            {!publicPage && <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>}
            {publicPage && <p className="text-xs text-primary/70 mb-6">GST added where applicable</p>}
            <ul className="space-y-3 mb-8">
              {(publicPage ? ['One event', 'Complete platform access', '12 months of access'] : [t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')]).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" className="text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {renderCta('essential', <Button variant="outline" className="w-full rounded-xl">{ctaContent}</Button>)}
            <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
            {!publicPage && <p className="text-xs text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>}
          </div>

          {/* Premium — highlighted */}
          <div className="bg-white rounded-[20px] p-8 pt-6 lg:pt-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)] border-2 border-primary lg:scale-105 relative hover:-translate-y-2 hover:shadow-[0_12px_50px_rgba(0,0,0,0.15)] transition-all duration-300">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md inline-flex items-center gap-1.5">
                {publicPage && <Crown size={14} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />}
                {t('pricing.mostPopular')}
              </span>
            </div>
            <p className="text-xs text-primary/70 text-center mt-2">{t('pricing.bestForMost')}</p>
            <div className="flex items-center gap-2 mb-4 mt-1">
              <Crown size={22} strokeWidth={1.8} aria-hidden="true" className="text-primary" />
              <h3 className="text-xl font-bold text-gray-900">{publicPage ? PUBLIC_COUPLE_PLAN_DETAILS.premium.name : t('pricing.premium.name')}</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-900">{formatPrice(currency, plans.premium.price)}</span>
              {!publicPage && plans.premium.originalPrice && <span className="text-gray-400 line-through text-lg">{formatPrice(currency, plans.premium.originalPrice)}</span>}
            </div>
            <p className="text-sm text-gray-500 mb-1">{publicPage ? `Up to ${PUBLIC_COUPLE_PLAN_DETAILS.premium.guests} guests · one event · 12 months` : t('pricing.premium.guests')}</p>
            {!publicPage && <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>}
            {publicPage && <p className="text-xs text-primary/70 mb-6">GST added where applicable</p>}
            <ul className="space-y-3 mb-8">
              {(publicPage ? ['One event', 'Complete platform access', '12 months of access'] : [t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')]).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" className="text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {renderCta('premium', <Button className={`w-full rounded-xl ${publicPage ? 'ww-button-espresso' : 'bg-primary text-white hover:bg-primary/90'}`}>{ctaContent}</Button>)}
            <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
            {!publicPage && <p className="text-xs text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>}
          </div>

          {/* Unlimited */}
          <div className="bg-white rounded-[20px] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Heart size={22} strokeWidth={1.8} aria-hidden="true" className="text-primary" />
              <h3 className="text-xl font-bold text-gray-900">{publicPage ? PUBLIC_COUPLE_PLAN_DETAILS.unlimited.name : t('pricing.unlimited.name')}</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-900">{formatPrice(currency, plans.unlimited.price)}</span>
              {!publicPage && plans.unlimited.originalPrice && <span className="text-gray-400 line-through text-lg">{formatPrice(currency, plans.unlimited.originalPrice)}</span>}
            </div>
            <p className="text-sm text-gray-500 mb-1">{publicPage ? `Up to ${PUBLIC_COUPLE_PLAN_DETAILS.unlimited.guests} guests · one event · 12 months` : t('pricing.unlimited.guests')}</p>
            {!publicPage && <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>}
            {publicPage && <p className="text-xs text-primary/70 mb-6">GST added where applicable</p>}
            <ul className="space-y-3 mb-8">
              {(publicPage ? ['One event', 'Complete platform access', '12 months of access'] : [t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')]).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" className="text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {renderCta('unlimited', <Button variant="outline" className="w-full rounded-xl">{ctaContent}</Button>)}
            <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
            {!publicPage && <p className="text-xs text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>}
          </div>

          {/* Vendor Pro */}
          <div className="bg-gray-900 text-white rounded-[20px] p-8 pt-6 lg:pt-8 shadow-[0_4px_30px_rgba(0,0,0,0.2)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-white text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">{t('pricing.forVenuesAndPros')}</span>
            </div>
            <div className="flex items-center gap-2 mb-4 mt-2">
              <Building2 size={22} strokeWidth={1.8} aria-hidden="true" className="text-[#C4A882]" />
              <h3 className="text-xl font-bold">{t('pricing.vendorPro.name')}</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold">{formatPrice(currency, vendor.price)}</span>
              <span className="text-gray-400 text-lg">/{t('pricing.perMonth') || 'month'}</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">{t('pricing.vendorPro.guests')}</p>
            {publicPage && <p className="text-xs text-[#C4A882] -mt-4 mb-5">A$300/month excluding GST · approval required</p>}
            <ul className="space-y-2 mb-8">
              {(publicPage ? ['100 active events', 'For venues and event professionals', 'For wedding planners', 'For DJs and MCs', 'Complete platform access'] : [t('pricing.features.vendorActiveEvents'), t('pricing.features.unlimitedGuests'), t('pricing.features.fullPlatform'), t('pricing.features.forVenues'), t('pricing.features.weddingPlanners'), t('pricing.features.djMcPros')]).map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                  <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" className="text-[#C4A882] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {renderCta('vendor_pro', <Button className={`w-full rounded-xl ${publicPage ? 'ww-button-espresso' : 'bg-primary text-white hover:bg-primary/90'}`}>{ctaContent}</Button>)}
            <p className="text-xs text-gray-500 text-center mt-3">{t('pricing.approvalRequired')}</p>
          </div>
        </div>
        <div className="text-center mt-12">
          <p className="text-base font-medium text-gray-700">{publicPage ? 'Start with the free trial, then choose the capacity your event needs.' : t('pricing.riskReversal1')}</p>
          {!publicPage && <p className="text-sm text-gray-400 mt-1">{t('pricing.riskReversal2')}</p>}
        </div>
      </div>
    </section>
  );
};
