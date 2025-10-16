import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminLogs = () => {
  const [uploadLogs, setUploadLogs] = useState<any[]>([]);
  const [edgeLogs, setEdgeLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Mock logs for demonstration
    setUploadLogs([
      { id: 1, timestamp: new Date().toISOString(), event: 'Upload Error', user: 'user@example.com', message: 'File too large', severity: 'error' },
      { id: 2, timestamp: new Date().toISOString(), event: 'Upload Success', user: 'user2@example.com', message: 'Photo uploaded', severity: 'info' },
    ]);

    setEdgeLogs([
      { id: 1, timestamp: new Date().toISOString(), function: 'create-media-upload-url', status: 200, message: 'Success' },
      { id: 2, timestamp: new Date().toISOString(), function: 'confirm-media-upload', status: 500, message: 'Database error' },
    ]);
  }, []);

  const handleDownloadLogs = () => {
    toast({
      title: 'Downloading Logs',
      description: 'CSV export started...',
    });
  };

  const filteredUploadLogs = uploadLogs.filter((log) =>
    log.event?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEdgeLogs = edgeLogs.filter((log) =>
    log.function?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Upload Errors */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle style={{ color: '#6D28D9' }}>
            <AlertCircle className="w-5 h-5 inline mr-2" />
            Upload Errors
          </CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleDownloadLogs}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUploadLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={log.severity === 'error' ? 'destructive' : 'default'}>
                      {log.severity}
                    </Badge>
                    <span className="font-medium">{log.event}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground">User: {log.user}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edge Function Logs */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle style={{ color: '#6D28D9' }}>Edge Function Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEdgeLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={log.status >= 400 ? 'destructive' : 'default'}>
                      {log.status}
                    </Badge>
                    <span className="font-medium">{log.function}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.message}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
