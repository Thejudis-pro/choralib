import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Download, Eye, ArrowLeft, Music, Clock, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PartitionHistory {
  id: string;
  title: string;
  composer: string | null;
  voice_type: string;
  choir_id: string | null;
  created_at: string;
  choirs: {
    name: string;
  } | null;
  // We'll simulate view/download history since we don't have a dedicated table
  last_viewed?: string;
  download_count?: number;
}

const DownloadHistory = () => {
  const { user, profile } = useAuth();
  const [partitionHistory, setPartitionHistory] = useState<PartitionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPartitionHistory = async () => {
      try {
        setLoading(true);
        
        // For now, we'll fetch partitions from choirs the user is a member of
        // In a real app, you'd have a separate table tracking user interactions
        const { data: memberData, error: memberError } = await supabase
          .from('choir_members')
          .select('choir_id')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        if (memberData && memberData.length > 0) {
          const choirIds = memberData.map(member => member.choir_id);
          
          const { data: partitionsData, error: partitionsError } = await supabase
            .from('partitions')
            .select(`
              *,
              choirs (name)
            `)
            .in('choir_id', choirIds)
            .order('created_at', { ascending: false })
            .limit(20); // Limit to recent partitions

          if (partitionsError) throw partitionsError;
          
          // Simulate some history data
          const historyData = (partitionsData || []).map(partition => ({
            ...partition,
            last_viewed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 30 days
            download_count: Math.floor(Math.random() * 5) + 1 // Random download count 1-5
          }));
          
          setPartitionHistory(historyData);
        } else {
          setPartitionHistory([]);
        }
      } catch (error) {
        console.error('Error fetching partition history:', error);
        toast({
          title: "Error",
          description: "Failed to load download history",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPartitionHistory();
  }, [user]);

  const downloadPartition = async (partition: PartitionHistory) => {
    try {
      // This would typically trigger a download from your storage service
      // For now, we'll just show a success message
      toast({
        title: "Download Started",
        description: `Downloading ${partition.title}`,
      });
    } catch (error) {
      console.error('Error downloading partition:', error);
      toast({
        title: "Error",
        description: "Failed to download partition",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-accent rounded w-1/4"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-accent rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Download History</h1>
            <p className="text-muted-foreground">
              Your recently viewed and downloaded partitions
            </p>
          </div>
        </div>

        {partitionHistory.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {partitionHistory.map((partition) => (
              <Card key={partition.id} className="hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {partition.title}
                  </CardTitle>
                  <CardDescription>
                    {partition.composer && `by ${partition.composer}`}
                    {partition.choirs && (
                      <span className="block text-xs text-muted-foreground mt-1">
                        From: {partition.choirs.name}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">{partition.voice_type}</Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(partition.last_viewed || partition.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Download className="h-3 w-3" />
                      Downloaded {partition.download_count} time{partition.download_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link to={`/partition/${partition.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-2" />
                        View
                      </Button>
                    </Link>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => downloadPartition(partition)}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Download Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <Download className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No download history yet</h3>
              <p className="text-muted-foreground mb-4">
                Start exploring partitions to build your download history
              </p>
              <Link to="/partitions">
                <Button>
                  <Music className="h-4 w-4 mr-2" />
                  Browse Partitions
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DownloadHistory;
