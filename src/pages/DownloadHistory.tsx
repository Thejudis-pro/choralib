import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Music, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ViewedPartition {
  id: string;
  title: string;
  composer: string | null;
  category: string | null;
  created_at: string;
  lastViewed?: string;
  viewCount?: number;
}

const DownloadHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewedPartitions, setViewedPartitions] = useState<ViewedPartition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadViewHistory(); }, [user]);

  const loadViewHistory = async () => {
    try {
      setLoading(true);
      const viewHistory = JSON.parse(localStorage.getItem(`partition_views_${user?.id}`) || '[]');
      if (viewHistory.length === 0) { setViewedPartitions([]); setLoading(false); return; }

      const { data, error } = await supabase
        .from('partitions')
        .select('id, title, composer, category, created_at')
        .in('id', viewHistory.map((item: any) => item.partitionId));
      if (error) throw error;

      const partitionsWithHistory = ((data || []) as any[]).map(partition => {
        const historyItem = viewHistory.find((item: any) => item.partitionId === partition.id);
        return { ...partition, lastViewed: historyItem?.lastViewed || new Date().toISOString(), viewCount: historyItem?.viewCount || 1 };
      });
      partitionsWithHistory.sort((a, b) => new Date(b.lastViewed!).getTime() - new Date(a.lastViewed!).getTime());
      setViewedPartitions(partitionsWithHistory);
    } catch (error) { toast.error('Failed to load view history'); } finally { setLoading(false); }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear your view history?')) {
      localStorage.removeItem(`partition_views_${user?.id}`);
      setViewedPartitions([]);
      toast.success('View history cleared');
    }
  };

  if (loading) return <div className="min-h-screen bg-background p-4"><div className="max-w-4xl mx-auto text-center py-8">Loading view history...</div></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Download className="h-8 w-8 text-primary" /><h1 className="text-3xl font-bold">View History</h1></div>
          <div className="flex gap-2">
            {viewedPartitions.length > 0 && <Button variant="outline" onClick={clearHistory}>Clear History</Button>}
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
          </div>
        </div>

        {viewedPartitions.length === 0 ? (
          <Card><CardContent className="text-center py-12"><Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" /><h3 className="text-xl font-semibold mb-2">No view history</h3><p className="text-muted-foreground mb-4">Partitions you view will appear here.</p><Button onClick={() => navigate('/dashboard')}>Browse Partitions</Button></CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {viewedPartitions.map(partition => (
              <Card key={partition.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg"><Music className="h-5 w-5" />{partition.title}</CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                    {partition.composer && <span className="text-sm">{partition.composer}</span>}
                    <div className="flex items-center gap-1"><Clock className="h-4 w-4" /><span className="text-sm">Last viewed {new Date(partition.lastViewed!).toLocaleDateString()}</span></div>
                    <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /><span className="text-sm">Viewed {partition.viewCount} time{partition.viewCount !== 1 ? 's' : ''}</span></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{partition.category || 'general'}</Badge>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/partition/${partition.id}`)}>View Again</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadHistory;
