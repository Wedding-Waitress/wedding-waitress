import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricingSection, type PlanKey } from '@/components/Pricing/PricingSection';
import { SeoHead } from '@/components/SEO/SeoHead';

export const UpgradePricing: React.FC = () => {
  const navigate = useNavigate();

  const handlePlanSelect = (plan: PlanKey) => {
    navigate(`/dashboard/upgrade/checkout?plan=${plan}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF9F4] to-[#F4EDE0]">
      <SeoHead title="Upgrade Plan – Wedding Waitress" description="Choose the perfect plan for your wedding." />
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard?tab=account')}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Profile
        </Button>
      </div>
      <PricingSection onPlanSelect={handlePlanSelect} />
    </div>
  );
};

export default UpgradePricing;
