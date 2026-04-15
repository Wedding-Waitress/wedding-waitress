import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Search, Users, Clock, AlertTriangle } from 'lucide-react';

interface SubscriptionRow {
  id: string;
  user_id: string;
  status: string;
  is_read_only: boolean;
  started_at: string;
  expires_at: string;
  plan_name: string;
  user_name: string;
  user_email: string;
}

export const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      // Use service-role-accessible RPC or direct query
      // Since admin RLS allows reading via has_role, we query directly
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id, user_id, status, is_read_only, started_at, expires_at,
          subscription_plans ( name ),
          profiles ( first_name, last_name, email )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: SubscriptionRow[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        is_read_only: row.is_read_only,
        started_at: row.started_at,
        expires_at: row.expires_at,
        plan_name: row.subscription_plans?.name || 'Unknown',
        user_name: [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(' ') || 'No name',
        user_email: row.profiles?.email || 'No email',
      }));

      setSubscriptions(mapped);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      toast({ title: 'Error', description: 'Failed to load subscriptions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const handleAction = async (subscriptionId: string, action: 'approve' | 'reject') => {
    setActionLoading(subscriptionId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        body: { subscription_id: subscriptionId, action },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: action === 'approve' ? '✅ Approved' : '❌ Rejected',
        description: `Subscription ${action === 'approve' ? 'activated' : 'rejected'} successfully.`,
      });

      await fetchSubscriptions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Action failed', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const pending = subscriptions.filter(s => s.status === 'pending_approval');
  const active = subscriptions.filter(s => s.status === 'active');
  const expired = subscriptions.filter(s => ['expired', 'rejected', 'cancelled'].includes(s.status));

  const filtered = subscriptions.filter(s =>
    !searchTerm ||
    s.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Active' },
      pending_approval: { color: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Pending Approval' },
      expired: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Expired' },
      rejected: { color: 'bg-red-100 text-red-700 border-red-300', label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-600 border-gray-300', label: 'Cancelled' },
    };
    const s = map[status] || { color: 'bg-gray-100 text-gray-600 border-gray-300', label: status };
    return <Badge variant="outline" className={s.color}>{s.label}</Badge>;
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#967A59' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100"><Users className="w-5 h-5 text-green-700" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Active Subscriptions</p>
            <p className="text-2xl font-bold">{active.length}</p>
          </div>
        </Card>
        <Card className={`p-4 flex items-center gap-3 ${pending.length > 0 ? 'border-amber-400 border-2' : ''}`}>
          <div className="p-2 rounded-lg bg-amber-100"><Clock className="w-5 h-5 text-amber-700" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Pending Approvals</p>
            <p className="text-2xl font-bold">{pending.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100"><AlertTriangle className="w-5 h-5 text-red-700" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Expired / Rejected</p>
            <p className="text-2xl font-bold">{expired.length}</p>
          </div>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <Card className="border-amber-400 border-2">
          <div className="p-4 border-b bg-amber-50">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Vendor Approvals ({pending.length})
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.user_name}</TableCell>
                  <TableCell>{sub.user_email}</TableCell>
                  <TableCell>{sub.plan_name}</TableCell>
                  <TableCell>{formatDate(sub.started_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(sub.id, 'approve')}
                        disabled={actionLoading === sub.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(sub.id, 'reject')}
                        disabled={actionLoading === sub.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* All Subscriptions */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: '#967A59' }}>All Subscriptions ({subscriptions.length})</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, plan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Read-Only</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No matching subscriptions found.' : 'No subscriptions yet.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.user_name}</TableCell>
                  <TableCell>{sub.user_email}</TableCell>
                  <TableCell>{sub.plan_name}</TableCell>
                  <TableCell>{statusBadge(sub.status)}</TableCell>
                  <TableCell>{formatDate(sub.started_at)}</TableCell>
                  <TableCell>{formatDate(sub.expires_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={sub.is_read_only ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}>
                      {sub.is_read_only ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
