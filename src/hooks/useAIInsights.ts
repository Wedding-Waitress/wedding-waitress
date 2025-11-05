import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIInsights {
  metrics: {
    total_guests: number;
    attending: number;
    declined: number;
    pending: number;
    response_rate: string;
    days_until_event: number;
    dietary_breakdown: Record<string, number>;
  };
  insights: {
    predicted_attendance: number;
    confidence_level: 'high' | 'medium' | 'low';
    risk_alerts: Array<{
      severity: 'warning' | 'info' | 'success';
      title: string;
      description: string;
      action: string;
    }>;
    cost_suggestions?: string[];
    timeline_milestones?: Array<{
      days_from_now: number;
      title: string;
      description: string;
    }>;
  };
}

export const useAIInsights = (eventId: string | null) => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { event_id: eventId }
      });

      if (error) throw error;

      setInsights(data);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI insights',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      generateInsights();
    }
  }, [eventId]);

  return { insights, loading, refresh: generateInsights };
};