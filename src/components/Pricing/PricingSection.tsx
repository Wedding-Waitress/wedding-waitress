/**
 * Reusable pricing section — extracted verbatim from Landing.tsx.
 * Default behavior (no onPlanSelect) is IDENTICAL to the locked homepage section.
 * When onPlanSelect is provided (authenticated upgrade flow), CTAs invoke the callback
 * instead of routing through the sign-up funnel.
 */
import React from 'react';
import { Check, Crown, Zap, Heart, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/enhanced-button';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import { useTranslation } from 'react-i18next';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { PLAN_PRICING, VENDOR_PRICING, formatPrice } from '@/lib/currencyPricing';

export type PlanKey = 'essential' | 'premium' | 'unlimited' | 'vendor_pro';

interface Props {
  onPlanSelect?: (plan: PlanKey) => void;
}

export const PricingSection: React.FC<Props> = ({ onPlanSelect }) => {
  const { t } = useTranslation('landing');
  const { currency } = useCurrencyContext();
  const plans = PLAN_PRICING[currency];
  const vendor = VENDOR_PRICING[currency];

  const renderCta = (plan: PlanKey, button: React.ReactElement) => {
    if (onPlanSelect) {
      return React.cloneElement(button, { onClick: () => onPlanSelect(plan) });
    }
    return (
      <AuthGatedCtaLink to="/dashboard" asChild alwaysSignUp>
        {button}
      </AuthGatedCtaLink>
    );
  };

  return (
    <section id="pricing" className="py-16 md:py-20 px-4 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
          {t('pricing.title')}
        </h2>
        <p className="text-lg text-gray-500 text-center mb-4 max-w-xl mx-auto">
          {t('pricing.subtitle')}
        </p>
        <p className="text-base font-medium text-primary text-center mb-4 max-w-2xl mx-auto">
          {t('pricing.trialNote')}
        </p>
        <p className="text-sm text-gray-500 text-center mb-2 max-w-xl mx-auto">
          {t('pricing.reassurance')}
        </p>
        <p className="text-sm text-gray-400 text-center mb-16 max-w-xl mx-auto">
          {t('pricing.noHiddenFees')}
        </p>

        {/* Main Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {/* Essential */}
          <div className="bg-white rounded-[20px] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-gray-900">{t('pricing.essential.name')}</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-900">{formatPrice(currency, plans.essential.price)}</span>
              <span className="text-gray-400 line-through text-lg">{formatPrice(currency, plans.essential.originalPrice)}</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{t('pricing.essential.guests')}</p>
            <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>
            <ul className="space-y-3 mb-8">
              {[t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {renderCta('essential', <Button variant="outline" className="w-full rounded-xl">{t('pricing.getStarted')}</Button>)}
            <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
            <p className="text-xs text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>
          </div>

          {/* Premium — highlighted */}
          <div className="bg-white rounded-[20px] p-8 pt-6 lg:pt-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)] border-2 border-primary lg:scale-105 relative hover:-translate-y-2 hover:shadow-[0_12px_50px_rgba(0,0,0,0.15)] transition-all duration-300">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">{t('pricing.mostPopular')}</span>
            </div>
            <p className="text-xs text-primary/70 text-center mt-2">{t('pricing.bestForMost')}</p>
            <div className="flex items-center gap-2 mb-4 mt-1">
              <Crown className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-gray-900">{t('pricing.premium.name')}</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-900">{formatPrice(currency, plans.premium.price)}</span>
              <span className="text-gray-400 line-through text-lg">{formatPrice(currency, plans.premium.originalPrice)}</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{t('pricing.premium.guests')}</p>
            <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>
            <ul className="space-y-3 mb-8">
              {[t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {renderCta('premium', <Button className="w-full rounded-xl bg-primary text-white hover:bg-primary/90">{t('pricing.getStarted')}</Button>)}
            <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
            <p className="text-xs text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>
          </div>

          {/* Unlimited */}
          <div className="bg-white rounded-[20px] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-gray-900">{t('pricing.unlimited.name')}</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-900">{formatPrice(currency, plans.unlimited.price)}</span>
              <span className="text-gray-400 line-through text-lg">{formatPrice(currency, plans.unlimited.originalPrice)}</span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{t('pricing.unlimited.guests')}</p>
            <p className="text-xs text-primary/70 mb-6">{t('pricing.saveLine')}</p>
            <ul className="space-y-3 mb-8">
              {[t('pricing.features.oneEvent'), t('pricing.features.fullAccess'), t('pricing.features.easySetup')].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {renderCta('unlimited', <Button variant="outline" className="w-full rounded-xl">{t('pricing.getStarted')}</Button>)}
            <p className="text-xs text-gray-400 text-center mt-2">{t('pricing.trialUnderButton')}</p>
            <p className="text-xs text-gray-400 text-center mt-1">{t('pricing.cardTrust')}</p>
          </div>

          {/* Vendor Pro */}
          <div className="bg-gray-900 text-white rounded-[20px] p-8 pt-6 lg:pt-8 shadow-[0_4px_30px_rgba(0,0,0,0.2)] hover:-translate-y-2 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)] transition-all duration-300 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-white text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">{t('pricing.forVenuesAndPros')}</span>
            </div>
            <div className="flex items-center gap-2 mb-4 mt-2">
              <Building2 className="w-5 h-5 text-[#C4A882]" />
              <h3 className="text-xl font-bold">{t('pricing.vendorPro.name')}</h3>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold">{formatPrice(currency, vendor.price)}</span>
              <span className="text-gray-400 text-lg">/{t('pricing.perMonth') || 'month'}</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">{t('pricing.vendorPro.guests')}</p>
            <ul className="space-y-2 mb-8">
              {[t('pricing.features.unlimitedEvents'), t('pricing.features.unlimitedGuests'), t('pricing.features.fullPlatform'), t('pricing.features.forVenues'), t('pricing.features.weddingPlanners'), t('pricing.features.djMcPros')].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                  <Check className="w-4 h-4 text-[#C4A882] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {renderCta('vendor_pro', <Button className="w-full rounded-xl bg-primary text-white hover:bg-primary/90">{t('pricing.getStarted')}</Button>)}
            <p className="text-xs text-gray-500 text-center mt-3">{t('pricing.approvalRequired')}</p>
          </div>
        </div>
        <div className="text-center mt-12">
          <p className="text-base font-medium text-gray-700">{t('pricing.riskReversal1')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('pricing.riskReversal2')}</p>
        </div>
      </div>
    </section>
  );
};
