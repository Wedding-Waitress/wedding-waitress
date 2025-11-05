import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, Eye } from 'lucide-react';
import { useReminderCampaigns } from '@/hooks/useReminderCampaigns';
import { formatDisplayDate } from '@/lib/utils';

interface ReminderCampaignsListProps {
  eventId: string;
}

export const ReminderCampaignsList: React.FC<ReminderCampaignsListProps> = ({ eventId }) => {
  const { campaigns, loading, deleteCampaign } = useReminderCampaigns(eventId);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'secondary', label: 'Draft' },
      scheduled: { variant: 'default', label: 'Scheduled' },
      sending: { variant: 'default', label: 'Sending' },
      completed: { variant: 'default', label: 'Completed' }
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-4">Loading campaigns...</div>;
  }

  if (campaigns.length === 0) {
    return (
      <Card className="ww-box">
        <CardContent className="p-6 text-center text-muted-foreground">
          No reminder campaigns yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ww-box">
      <CardHeader>
        <CardTitle>Campaign History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>
                  {formatDisplayDate(campaign.created_at)}
                </TableCell>
                <TableCell className="capitalize">
                  {campaign.delivery_method}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{campaign.total_count}</Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(campaign.status)}
                </TableCell>
                <TableCell>
                  {campaign.sent_count}/{campaign.total_count}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCampaign(campaign.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
