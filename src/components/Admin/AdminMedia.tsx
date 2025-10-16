import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, Trash2, Image, Video, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminMedia = () => {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('media_uploads')
        .select(`
          *,
          events(name, user_id),
          galleries(owner_id)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Get owner emails
      const mediaWithOwners = await Promise.all(
        (data || []).map(async (item) => {
          const ownerId = item.events?.user_id || item.galleries?.owner_id;
          if (!ownerId) return { ...item, ownerEmail: 'N/A' };

          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', ownerId)
            .single();

          return {
            ...item,
            eventName: item.events?.name || 'N/A',
            ownerEmail: profile?.email || 'N/A',
          };
        })
      );

      setMedia(mediaWithOwners);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({
        title: 'Error',
        description: 'Failed to load media',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMedia = () => {
    let filtered = media;

    if (activeType !== 'all') {
      filtered = filtered.filter((item) => item.post_type === activeType);
    }

    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#6D28D9' }}></div>
    </div>;
  }

  const filteredMedia = getFilteredMedia();

  return (
    <div className="space-y-6">
      <Card className="ww-box">
        <CardHeader>
          <CardTitle style={{ color: '#6D28D9' }}>Media Management</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by event or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeType} onValueChange={setActiveType}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="photo">Photos</TabsTrigger>
              <TabsTrigger value="video">Videos</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
            </TabsList>

            <TabsContent value={activeType} className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedia.map((item) => {
                    const TypeIcon = item.post_type === 'photo' ? Image : item.post_type === 'video' ? Video : Mic;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="w-4 h-4" style={{ color: '#6D28D9' }} />
                            <span className="capitalize">{item.post_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.eventName}</TableCell>
                        <TableCell>{item.ownerEmail}</TableCell>
                        <TableCell>{formatFileSize(item.file_size_bytes)}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'approved' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
