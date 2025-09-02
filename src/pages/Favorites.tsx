import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Heart, Music, User, Calendar, X } from 'lucide-react';

interface FavoritePartition {
  id: string;
  partition_id: string;
  created_at: string;
  partitions: {
    id: string;
    title: string;
    composer: string;
    voice_type: string;
    file_path: string;
    created_at: string;
    choirs: {
      name: string;
    };
  };
}

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoritePartition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          *,
          partitions (
            id,
            title,
            composer,
            voice_type,
            file_path,
            created_at,
            choirs (
              name
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
      
      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading favorites...</div>
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
            <Heart className="h-8 w-8 text-primary fill-current" />
            <h1 className="text-3xl font-bold">My Favorites</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-4">
                Start exploring partitions and add them to your favorites!
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Browse Partitions
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Music className="h-5 w-5" />
                        {favorite.partitions.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span className="text-sm">{favorite.partitions.composer}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            Added {new Date(favorite.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFavorite(favorite.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{favorite.partitions.voice_type}</Badge>
                      <Badge variant="outline">{favorite.partitions.choirs?.name}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/partition/${favorite.partitions.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {favorites.length > 0 && (
          <Card>
            <CardContent className="text-center py-6">
              <p className="text-muted-foreground">
                You have <span className="font-semibold text-foreground">{favorites.length}</span> favorite partition{favorites.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Favorites;