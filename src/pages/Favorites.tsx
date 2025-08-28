import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Download, Eye, Trash2, ArrowLeft, Music } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FavoritePartition {
  id: string;
  partition_id: string;
  created_at: string;
  partitions: {
    id: string;
    title: string;
    composer: string | null;
    voice_type: string;
    choir_id: string | null;
    choirs: {
      name: string;
    } | null;
  };
}

const Favorites = () => {
  const { user, profile } = useAuth();
  const [favorites, setFavorites] = useState<FavoritePartition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFavorites = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('favorites')
          .select(`
            *,
            partitions (
              *,
              choirs (name)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFavorites(data || []);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        toast({
          title: "Error",
          description: "Failed to load favorites",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      
      toast({
        title: "Success",
        description: "Removed from favorites",
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    }
  };

  const downloadPartition = async (partition: FavoritePartition['partitions']) => {
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
            <h1 className="text-3xl font-bold">My Favorites</h1>
            <p className="text-muted-foreground">
              Your saved partitions and sheet music
            </p>
          </div>
        </div>

        {favorites.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500 fill-current" />
                    {favorite.partitions.title}
                  </CardTitle>
                  <CardDescription>
                    {favorite.partitions.composer && `by ${favorite.partitions.composer}`}
                    {favorite.partitions.choirs && (
                      <span className="block text-xs text-muted-foreground mt-1">
                        From: {favorite.partitions.choirs.name}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">{favorite.partitions.voice_type}</Badge>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(favorite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link to={`/partition/${favorite.partitions.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-2" />
                        View
                      </Button>
                    </Link>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => downloadPartition(favorite.partitions)}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Download
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3 mr-2" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from Favorites</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{favorite.partitions.title}" from your favorites?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeFavorite(favorite.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-4">
                Start exploring partitions and add your favorites to see them here
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

export default Favorites;
