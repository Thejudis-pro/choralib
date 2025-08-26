import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  FileText, 
  Download, 
  Heart, 
  HeartOff,
  Filter,
  Music,
  User,
  Calendar,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import UploadPartition from '@/components/UploadPartition';

interface Partition {
  id: string;
  title: string;
  composer: string | null;
  voice_type: string;
  tags: string[] | null;
  file_path: string;
  file_size: number | null;
  created_at: string;
  uploaded_by: string;
  choir_id: string | null;
  is_big_library: boolean;
  is_favorited?: boolean;
  is_downloaded?: boolean;
}

interface Choir {
  id: string;
  name: string;
  code: string;
}

const PartitionManagement = () => {
  const { user, profile, loading } = useAuth();
  const { choirId } = useParams();
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [choirs, setChoirs] = useState<Choir[]>([]);
  const [currentChoir, setCurrentChoir] = useState<Choir | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [downloads, setDownloads] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVoiceType, setFilterVoiceType] = useState('all');
  const [filterTag, setFilterTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (user && profile) {
      fetchData();
    }
  }, [user, profile, choirId]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch choirs (for admin)
      if (isAdmin) {
        const { data: choirsData } = await supabase
          .from('choirs')
          .select('id, name, code')
          .eq('admin_id', user.id);
        setChoirs(choirsData || []);

        if (choirId) {
          const choir = choirsData?.find(c => c.id === choirId);
          setCurrentChoir(choir || null);
        }
      } else {
        // Fetch user's choirs (for members)
        const { data: membershipData } = await supabase
          .from('choir_members')
          .select('choir_id, choirs(id, name, code)')
          .eq('user_id', user.id);
        
        const memberChoirs = membershipData?.map(m => m.choirs).filter(Boolean) as Choir[];
        setChoirs(memberChoirs || []);

        if (choirId) {
          const choir = memberChoirs?.find(c => c.id === choirId);
          setCurrentChoir(choir || null);
        }
      }

      // Fetch partitions
      let query = supabase.from('partitions').select('*');
      
      if (choirId) {
        query = query.eq('choir_id', choirId);
      } else if (isAdmin) {
        // Admin sees all their uploaded partitions
        query = query.eq('uploaded_by', user.id);
      } else {
        // Members see partitions from their choirs + big library if subscribed
        const choirIds = choirs.map(c => c.id);
        if (choirIds.length > 0) {
          query = query.or(`choir_id.in.(${choirIds.join(',')}),is_big_library.eq.true`);
        } else {
          query = query.eq('is_big_library', true);
        }
      }

      const { data: partitionsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user's favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('partition_id')
        .eq('user_id', user.id);

      const favoriteIds = new Set(favoritesData?.map(f => f.partition_id) || []);
      setFavorites(favoriteIds);

      // Fetch user's downloads
      const { data: downloadsData } = await supabase
        .from('downloads')
        .select('partition_id')
        .eq('user_id', user.id);

      const downloadIds = new Set(downloadsData?.map(d => d.partition_id) || []);
      setDownloads(downloadIds);

      // Add favorite and download status to partitions
      const partitionsWithStatus = partitionsData?.map(p => ({
        ...p,
        is_favorited: favoriteIds.has(p.id),
        is_downloaded: downloadIds.has(p.id)
      })) || [];

      setPartitions(partitionsWithStatus);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load partitions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (partitionId: string) => {
    if (!user) return;

    try {
      const isFavorited = favorites.has(partitionId);

      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('partition_id', partitionId);
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(partitionId);
          return newSet;
        });
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, partition_id: partitionId });
        
        setFavorites(prev => new Set(prev).add(partitionId));
      }

      // Update partition list
      setPartitions(prev => prev.map(p => 
        p.id === partitionId ? { ...p, is_favorited: !isFavorited } : p
      ));

    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    }
  };

  const unlockPartition = async (partition: Partition) => {
    if (!user) return;

    try {
      // Record the download/unlock in the database
      const { error } = await supabase
        .from('downloads')
        .insert({
          user_id: user.id,
          partition_id: partition.id
        });

      if (error) throw error;

      // Update local state
      setDownloads(prev => new Set(prev).add(partition.id));
      setPartitions(prev => prev.map(p => 
        p.id === partition.id ? { ...p, is_downloaded: true } : p
      ));

      toast({
        title: "Partition unlocked",
        description: `"${partition.title}" is now available for viewing`
      });

    } catch (error: any) {
      console.error('Unlock error:', error);
      toast({
        title: "Unlock failed",
        description: error.message || "Failed to unlock partition",
        variant: "destructive"
      });
    }
  };

  const deletePartition = async (partitionId: string) => {
    if (!user || !isAdmin) return;

    try {
      const { error } = await supabase
        .from('partitions')
        .delete()
        .eq('id', partitionId)
        .eq('uploaded_by', user.id);

      if (error) throw error;

      setPartitions(prev => prev.filter(p => p.id !== partitionId));
      
      toast({
        title: "Partition deleted",
        description: "Partition has been removed successfully"
      });

    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete partition",
        variant: "destructive"
      });
    }
  };

  const filteredPartitions = partitions.filter(partition => {
    const matchesSearch = !searchTerm || 
      partition.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partition.composer?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVoiceType = filterVoiceType === 'all' || partition.voice_type === filterVoiceType;
    
    const matchesTag = !filterTag || 
      partition.tags?.some(tag => tag.toLowerCase().includes(filterTag.toLowerCase()));

    return matchesSearch && matchesVoiceType && matchesTag;
  });

  const allTags = Array.from(new Set(partitions.flatMap(p => p.tags || [])));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {currentChoir ? `${currentChoir.name} - Partitions` : 'Partition Management'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? 'Manage your choir partitions' : 'Browse available partitions'}
            </p>
          </div>
          
          {isAdmin && (
            <UploadPartition 
              choirId={choirId} 
              onUploadComplete={fetchData}
            />
          )}
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search partitions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-2 block">Voice Type</label>
                  <Select value={filterVoiceType} onValueChange={setFilterVoiceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Voices</SelectItem>
                      <SelectItem value="soprano">Soprano</SelectItem>
                      <SelectItem value="alto">Alto</SelectItem>
                      <SelectItem value="tenor">Tenor</SelectItem>
                      <SelectItem value="bass">Bass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tag</label>
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tag..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Tags</SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partitions Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : filteredPartitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartitions.map((partition) => (
              <Card key={partition.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{partition.title}</CardTitle>
                      {partition.composer && (
                        <p className="text-sm text-muted-foreground mt-1">{partition.composer}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(partition.id)}
                        className="h-8 w-8 p-0"
                      >
                        {partition.is_favorited ? (
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        ) : (
                          <HeartOff className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {isAdmin && partition.uploaded_by === user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => deletePartition(partition.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{partition.voice_type}</Badge>
                    {partition.is_big_library && (
                      <Badge variant="default">Big Library</Badge>
                    )}
                    {partition.is_downloaded && (
                      <Badge variant="outline" className="border-green-500 text-green-700">
                        Unlocked
                      </Badge>
                    )}
                  </div>

                  {partition.tags && partition.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {partition.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {partition.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{partition.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(partition.created_at).toLocaleDateString()}
                    </div>
                    {partition.file_size && (
                      <span>{Math.round(partition.file_size / 1024)} KB</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!partition.is_downloaded ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unlockPartition(partition)}
                        className="flex-1 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Unlock
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.open(`/partition/${partition.id}`, '_blank')}
                        className="flex-1 gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No partitions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterVoiceType !== 'all' || filterTag
                  ? 'Try adjusting your search or filters'
                  : isAdmin
                  ? 'Upload your first partition to get started'
                  : 'No partitions available yet'
                }
              </p>
              {isAdmin && !searchTerm && filterVoiceType === 'all' && !filterTag && (
                <UploadPartition 
                  choirId={choirId} 
                  onUploadComplete={fetchData}
                  trigger={
                    <Button variant="default" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Upload First Partition
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PartitionManagement;