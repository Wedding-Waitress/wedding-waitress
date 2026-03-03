import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DynamicQRCode {
  id: string;
  user_id: string;
  code: string;
  label: string;
  current_event_id: string | null;
  destination_type: string;
  is_active: boolean;
  created_at: string;
}

export interface QRScanStats {
  total_scans: number;
  unique_visitors: number;
  scans_by_day: { date: string; count: number }[];
}

export const useDynamicQRCodes = () => {
  const [qrCodes, setQRCodes] = useState<DynamicQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQRCodes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dynamic_qr_codes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQRCodes((data as DynamicQRCode[]) || []);
    } catch (err) {
      console.error('Error fetching dynamic QR codes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  const createQRCode = async (label: string): Promise<DynamicQRCode | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate code via RPC
      const { data: code, error: codeErr } = await supabase.rpc('generate_dynamic_qr_code');
      if (codeErr) throw codeErr;

      const { data, error } = await supabase
        .from('dynamic_qr_codes')
        .insert({
          user_id: user.id,
          code: code as string,
          label,
        })
        .select()
        .single();

      if (error) throw error;
      const newCode = data as DynamicQRCode;
      setQRCodes(prev => [newCode, ...prev]);
      toast({ title: 'Dynamic QR Code created', description: `"${label}" is ready to use.` });
      return newCode;
    } catch (err: any) {
      console.error('Error creating dynamic QR code:', err);
      toast({ title: 'Error', description: 'Failed to create QR code.', variant: 'destructive' });
      return null;
    }
  };

  const updateQRCode = async (id: string, updates: Partial<Pick<DynamicQRCode, 'label' | 'current_event_id' | 'destination_type' | 'is_active'>>) => {
    try {
      const { error } = await supabase
        .from('dynamic_qr_codes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setQRCodes(prev => prev.map(qr => qr.id === id ? { ...qr, ...updates } : qr));
      toast({ title: 'QR Code updated' });
    } catch (err: any) {
      console.error('Error updating dynamic QR code:', err);
      toast({ title: 'Error', description: 'Failed to update QR code.', variant: 'destructive' });
    }
  };

  const deleteQRCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dynamic_qr_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setQRCodes(prev => prev.filter(qr => qr.id !== id));
      toast({ title: 'QR Code deleted' });
    } catch (err: any) {
      console.error('Error deleting dynamic QR code:', err);
      toast({ title: 'Error', description: 'Failed to delete QR code.', variant: 'destructive' });
    }
  };

  const getScanStats = async (qrCodeId: string): Promise<QRScanStats> => {
    try {
      const { data, error } = await supabase
        .from('qr_scan_logs')
        .select('scanned_at, ip_hash')
        .eq('qr_code_id', qrCodeId)
        .order('scanned_at', { ascending: true });

      if (error) throw error;

      const logs = (data as { scanned_at: string; ip_hash: string }[]) || [];
      const uniqueIPs = new Set(logs.map(l => l.ip_hash));

      // Group by day
      const dayMap: Record<string, number> = {};
      logs.forEach(l => {
        const day = l.scanned_at.slice(0, 10);
        dayMap[day] = (dayMap[day] || 0) + 1;
      });

      const scans_by_day = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

      return {
        total_scans: logs.length,
        unique_visitors: uniqueIPs.size,
        scans_by_day,
      };
    } catch (err) {
      console.error('Error fetching scan stats:', err);
      return { total_scans: 0, unique_visitors: 0, scans_by_day: [] };
    }
  };

  return {
    qrCodes,
    loading,
    createQRCode,
    updateQRCode,
    deleteQRCode,
    getScanStats,
    refetch: fetchQRCodes,
  };
};
