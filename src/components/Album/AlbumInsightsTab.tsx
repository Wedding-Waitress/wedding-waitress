import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlbumStats } from '@/hooks/useAlbumStats';
import { StatCard } from './StatCard';
import { ImageIcon, Camera, Video, Mic, MessageSquare, Clock, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AlbumInsightsTabProps {
  eventId: string;
}

export const AlbumInsightsTab = ({ eventId }: AlbumInsightsTabProps) => {
  const { stats, last24h } = useAlbumStats(eventId);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard label="Total" value={stats.total} icon={ImageIcon} />
        <StatCard label="Photos" value={stats.photos} icon={Camera} />
        <StatCard label="Videos" value={stats.videos} icon={Video} />
        <StatCard label="Voice" value={stats.audio} icon={Mic} />
        <StatCard label="Guestbook" value={stats.guestbook} icon={MessageSquare} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="warning" />
        <StatCard label="Hidden" value={stats.hidden} icon={EyeOff} color="muted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploads - Last 24 Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={last24h}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
