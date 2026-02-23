import React, { useState } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Check } from "lucide-react";

interface TabItem {
  id: string;
  label: string;
  isCompleted?: boolean;
}

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs: TabItem[] = [
    { id: "my-events", label: "My Events" },
    { id: "guest-list", label: "Guest List" },
    { id: "table-list", label: "Table List" },
    { id: "floor-plan", label: "Floor Plan" },
    { id: "signage", label: "Signage" },
    { id: "venue-charts", label: "Venue Charts" },
    { id: "qr-code", label: "QR Code" }
  ];

  return (
    <div className="mb-6">
      <div className="flex gap-3 sm:gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "gradient" : "outline"}
            size="sm"
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-shrink-0 whitespace-nowrap transition-all duration-300 text-base sm:text-sm
              ${activeTab === tab.id 
                ? 'shadow-purple-glow transform scale-105' 
                : 'hover:shadow-elevated hover:scale-102'
              }
            `}
          >
            {tab.isCompleted && (
              <Check className="w-3 h-3 mr-1 text-success" />
            )}
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};