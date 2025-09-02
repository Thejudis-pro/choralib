import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Music, User, Calendar, Clock } from 'lucide-react';

interface ViewedPartition {
  id: string;
  title: string;
  composer: string;
  voice_type: string;
  file_path: string;
  created_at: string;
  choirs: {
    name: string;
  };
  lastViewed?: string;
  viewCount?: number;
}

const DownloadHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewedPartitions, setViewedPartitions] = useState<ViewedPartition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadViewHistory();
    }
  }, [user]);

  const loadViewHistory = async () => {
    try {
      setLoading(true);
      
      // Get viewed partition IDs from localStorage
      const viewHistory = JSON.parse(localStorage.getItem(`partition_views_${user?.id}`) || '[]');
      
      if (viewHistory.length === 0) {
        setViewedPartitions([]);
        setLoading(false);
        return;
      }

      // Fetch partition details for viewed partitions
      const { data, error } = await supabase
        .from('partitions')
        .select(`
          id,
          title,
          composer,
          voice_type,
          file_path,
          created_at,
          choirs (
            name
          )
        `)
        .in('id', viewHistory.map((item: any) => item.partitionId))
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Merge with view history data
      const partitionsWithHistory = (data || []).map(partition => {
        const historyItem = viewHistory.find((item: any) => item.partitionId === partition.id);
        return {
          ...partition,
          lastViewed: historyItem?.lastViewed || new Date().toISOString(),
          viewCount: historyItem?.viewCount || 1
        };
      });

      // Sort by last viewed
      partitionsWithHistory.sort((a, b) => 
        new Date(b.lastViewed!).getTime() - new Date(a.lastViewed!).getTime()
      );

      setViewedPartitions(partitionsWithHistory);
    } catch (error) {
      console.error('Error loading view history:', error);
      toast.error('Failed to load view history');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear your view history?')) {
      localStorage.removeItem(`partition_views_${user?.id}`);
      setViewedPartitions([]);
      toast.success('View history cleared');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading view history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Download className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">View History</h1>
          </div>
          <div className="flex gap-2">
            {viewedPartitions.length > 0 && (
              <Button variant="outline" onClick={clearHistory}>
                Clear History
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* View History List */}
        {viewedPartitions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No view history</h3>
              <p className="text-muted-foreground mb-4">
                Partitions you view will appear here for easy access.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Browse Partitions
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {viewedPartitions.map((partition) => (
              <Card key={partition.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Music className="h-5 w-5" />
                        {partition.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span className="text-sm">{partition.composer}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            Last viewed {new Date(partition.lastViewed!).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            Viewed {partition.viewCount} time{partition.viewCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{partition.voice_type}</Badge>
                      <Badge variant="outline">{partition.choirs?.name}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/partition/${partition.id}`)}
                      >
                        View Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {viewedPartitions.length > 0 && (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-muted-foreground">
                You have viewed <span className="font-semibold text-foreground">{viewedPartitions.length}</span> unique partition{viewedPartitions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DownloadHistory;