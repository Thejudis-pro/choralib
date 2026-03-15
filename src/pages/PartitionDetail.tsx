import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Heart, HeartOff, FileText, Music, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PDFViewer from '@/components/PDFViewer';
import { partitionService } from '@/lib/partitionService';

interface Partition {
  id: string;
  title: string;
  composer: string | null;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  category: string | null;
  is_public: boolean;
  created_at: string;
  uploaded_by: string;
  choir_id: string | null;
  uploader_name?: string;
  choir_name?: string;
}

const PartitionDetail = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const [partition, setPartition] = useState<Partition | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => { if (user && id) { fetchPartition(); checkFavoriteStatus(); partitionService.trackPartitionView(id, user.id); } }, [user, id]);
  useEffect(() => { if (partition?.file_url && !previewUrl) generatePreviewUrl(); }, [partition, previewUrl]);

  const fetchPartition = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from('partitions').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) { setPartition(null); setIsLoading(false); return; }

      let uploaderName = 'Unknown';
      if ((data as any).uploaded_by) {
        const { data: ud } = await supabase.from('profiles').select('full_name').eq('user_id', (data as any).uploaded_by).single();
        uploaderName = (ud as any)?.full_name || 'Unknown';
      }
      let choirName = null;
      if ((data as any).choir_id) {
        const { data: cd } = await supabase.from('choirs').select('name').eq('id', (data as any).choir_id).single();
        choirName = (cd as any)?.name || null;
      }
      setPartition({ ...(data as any), uploader_name: uploaderName, choir_name: choirName });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load partition details", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !id) return;
    const { data } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('partition_id', id).maybeSingle();
    setIsFavorited(!!data);
  };

  const generatePreviewUrl = async () => {
    if (!partition?.file_url) return;
    try {
      const { data } = supabase.storage.from('partitions').getPublicUrl(partition.file_url);
      if (data?.publicUrl) setPreviewUrl(data.publicUrl);
    } catch (error) { console.error('Failed to generate preview URL:', error); }
  };

  const toggleFavorite = async () => {
    if (!user || !partition) return;
    try {
      if (isFavorited) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('partition_id', partition.id);
        setIsFavorited(false);
        toast({ title: "Removed from favorites" });
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, partition_id: partition.id } as any);
        setIsFavorited(true);
        toast({ title: "Added to favorites" });
      }
    } catch (error) { toast({ title: "Error", description: "Failed to update favorite status", variant: "destructive" }); }
  };

  if (loading || isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!partition) return (
    <div className="min-h-screen flex items-center justify-center"><Card className="w-full max-w-md"><CardContent className="pt-6 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">Partition not found</h3><Link to="/dashboard"><Button><ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard</Button></Link></CardContent></Card></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard"><Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button></Link>
          <div className="flex-1"><h1 className="text-3xl font-bold">{partition.title}</h1>{partition.composer && <p className="text-xl text-muted-foreground mt-1">by {partition.composer}</p>}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {previewUrl ? <PDFViewer url={previewUrl} title={`${partition.title} - Preview`} /> : (
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Partition Preview</CardTitle></CardHeader><CardContent><div className="w-full h-[600px] border rounded-lg flex items-center justify-center bg-muted"><div className="text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No file uploaded yet</p></div></div></CardContent></Card>
            )}
          </div>

          <div className="space-y-6">
            <Card><CardHeader><CardTitle>Actions</CardTitle></CardHeader><CardContent className="space-y-3">
              <Button onClick={toggleFavorite} variant="outline" className="w-full gap-2">{isFavorited ? <><Heart className="h-4 w-4 fill-red-500 text-red-500" />Remove from Favorites</> : <><HeartOff className="h-4 w-4" />Add to Favorites</>}</Button>
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Partition Details</CardTitle></CardHeader><CardContent className="space-y-4">
              <div className="flex items-center gap-3"><Music className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Category</p><Badge variant="secondary">{partition.category || 'general'}</Badge></div></div>
              <Separator />
              <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Uploaded by</p><p className="font-medium">{partition.uploader_name}</p></div></div>
              {partition.choir_name && <div className="flex items-center gap-3"><Music className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Choir</p><p className="font-medium">{partition.choir_name}</p></div></div>}
              <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Upload Date</p><p className="font-medium">{new Date(partition.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div></div>
              {partition.description && <div><p className="text-sm text-muted-foreground">Description</p><p className="text-sm">{partition.description}</p></div>}
            </CardContent></Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartitionDetail;
