import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Heart, HeartOff, Filter, Calendar, MoreVertical, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import UploadPartition from '@/components/UploadPartition';

interface Partition {
  id: string;
  title: string;
  composer: string | null;
  description: string | null;
  category: string | null;
  file_url: string | null;
  created_at: string;
  uploaded_by: string;
  choir_id: string | null;
  is_public: boolean;
  is_favorited?: boolean;
}

interface Choir { id: string; name: string; choir_code: string; }

const PartitionManagement = () => {
  const { user, profile, loading } = useAuth();
  const { choirId } = useParams();
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [choirs, setChoirs] = useState<Choir[]>([]);
  const [currentChoir, setCurrentChoir] = useState<Choir | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = profile?.role === 'admin';

  useEffect(() => { if (user && profile) fetchData(); }, [user, profile, choirId]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      if (isAdmin) {
        const { data: cd } = await supabase.from('choirs').select('id, name, choir_code').eq('admin_id', user.id);
        setChoirs((cd || []) as any);
        if (choirId) setCurrentChoir((cd as any)?.find((c: any) => c.id === choirId) || null);
      } else {
        const { data: md } = await supabase.from('choir_members').select('choir_id, choirs(id, name, choir_code)').eq('user_id', user.id);
        const mc = (md?.map((m: any) => m.choirs).filter(Boolean) || []) as Choir[];
        setChoirs(mc);
        if (choirId) setCurrentChoir(mc.find(c => c.id === choirId) || null);
      }

      let query = supabase.from('partitions').select('*');
      if (choirId) query = query.eq('choir_id', choirId);
      else if (isAdmin) query = query.eq('uploaded_by', user.id);

      const { data: pd, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const { data: fd } = await supabase.from('favorites').select('partition_id').eq('user_id', user.id);
      const favIds = new Set(fd?.map((f: any) => f.partition_id) || []);
      setFavorites(favIds);
      setPartitions((pd || []).map((p: any) => ({ ...p, is_favorited: favIds.has(p.id) })));
    } catch (error) {
      toast({ title: "Error", description: "Failed to load partitions", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const toggleFavorite = async (partitionId: string) => {
    if (!user) return;
    const isFav = favorites.has(partitionId);
    try {
      if (isFav) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('partition_id', partitionId);
        setFavorites(prev => { const s = new Set(prev); s.delete(partitionId); return s; });
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, partition_id: partitionId } as any);
        setFavorites(prev => new Set(prev).add(partitionId));
      }
      setPartitions(prev => prev.map(p => p.id === partitionId ? { ...p, is_favorited: !isFav } : p));
    } catch (error) { toast({ title: "Error", description: "Failed to update favorite", variant: "destructive" }); }
  };

  const deletePartition = async (partitionId: string) => {
    if (!user || !isAdmin) return;
    try {
      const { error } = await supabase.from('partitions').delete().eq('id', partitionId).eq('uploaded_by', user.id);
      if (error) throw error;
      setPartitions(prev => prev.filter(p => p.id !== partitionId));
      toast({ title: "Partition deleted" });
    } catch (error: any) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); }
  };

  const filteredPartitions = partitions.filter(p => !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.composer?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div><h1 className="text-3xl font-bold">{currentChoir ? `${currentChoir.name} - Partitions` : 'Partition Management'}</h1><p className="text-muted-foreground mt-1">{isAdmin ? 'Manage your choir partitions' : 'Browse available partitions'}</p></div>
          {isAdmin && <UploadPartition choirId={choirId} onUploadComplete={fetchData} />}
        </div>

        <Card className="mb-6"><CardContent className="pt-6"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search partitions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" /></div></CardContent></Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div></div>
        ) : filteredPartitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartitions.map(partition => (
              <Card key={partition.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1"><CardTitle className="text-lg line-clamp-2">{partition.title}</CardTitle>{partition.composer && <p className="text-sm text-muted-foreground mt-1">{partition.composer}</p>}</div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleFavorite(partition.id)} className="h-8 w-8 p-0">{partition.is_favorited ? <Heart className="h-4 w-4 fill-red-500 text-red-500" /> : <HeartOff className="h-4 w-4" />}</Button>
                      {isAdmin && partition.uploaded_by === user?.id && (
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => deletePartition(partition.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge variant="secondary">{partition.category || 'general'}</Badge>
                  <div className="flex items-center text-sm text-muted-foreground"><Calendar className="h-3 w-3 mr-1" />{new Date(partition.created_at).toLocaleDateString()}</div>
                  <Link to={`/partition/${partition.id}`} className="block"><Button variant="default" size="sm" className="w-full gap-2"><FileText className="h-4 w-4" />View</Button></Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">No partitions found</h3></CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default PartitionManagement;
