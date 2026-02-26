import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, ArrowLeft } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { AdminOverview } from '@/components/Admin/AdminOverview';
import { AdminUsers } from '@/components/Admin/AdminUsers';
import { AdminEvents } from '@/components/Admin/AdminEvents';
import { AdminSystemSettings } from '@/components/Admin/AdminSystemSettings';
import { AdminLogs } from '@/components/Admin/AdminLogs';
import { AdminNotificationSettings } from '@/components/Admin/AdminNotificationSettings';
import { AdminSubscriptions } from '@/components/Admin/AdminSubscriptions';
import { AdminInvitationTemplates } from '@/components/Admin/AdminInvitationTemplates';

export const Admin = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
      setAuthLoading(false);
    };

    checkAuth();
  }, [navigate]);

  // Redirect non-admins
  useEffect(() => {
    if (!adminLoading && !authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, authLoading, navigate]);

  if (adminLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#6D28D9' }}></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" style={{ color: '#6D28D9' }} />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#6D28D9' }}>
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">Production Environment</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
              style={{ borderColor: '#6D28D9', color: '#6D28D9' }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="events">
            <AdminEvents />
          </TabsContent>

          <TabsContent value="subscriptions">
            <AdminSubscriptions />
          </TabsContent>

          <TabsContent value="invitations">
            <AdminInvitationTemplates />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSystemSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <AdminNotificationSettings />
          </TabsContent>

          <TabsContent value="logs">
            <AdminLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
