import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Music, Plus, BookOpen, LogOut, Download, Heart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import JoinChoirDialog from '@/components/JoinChoirDialog';

interface Choir {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

interface ChoirMembership {
  choir_id: string;
  choirs: Choir;
}

const MemberDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [memberChoirs, setMemberChoirs] = useState<Choir[]>([]);
  const [loadingChoirs, setLoadingChoirs] = useState(true);
  const [recentPartitions, setRecentPartitions] = useState([]);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchMemberData = async () => {
      try {
        // Fetch choirs where user is a member
        const { data: memberData, error: memberError } = await supabase
          .from('choir_members')
          .select(`
            choir_id,
            choirs (*)
          `)
          .eq('user_id', user.id);

        if (memberError) throw memberError;
        
        const memberChoirsList = memberData?.map((membership: ChoirMembership) => membership.choirs) || [];
        setMemberChoirs(memberChoirsList);

        // Fetch recent partitions from member choirs
        const choirIds = memberChoirsList.map(choir => choir.id);
        if (choirIds.length > 0) {
          const { data: partitionsData, error: partitionsError } = await supabase
            .from('partitions')
            .select('*')
            .in('choir_id', choirIds)
            .order('created_at', { ascending: false })
            .limit(5);

          if (partitionsError) throw partitionsError;
          setRecentPartitions(partitionsData || []);
        }
      } catch (error) {
        console.error('Error fetching member data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoadingChoirs(false);
      }
    };

    fetchMemberData();
  }, [user, profile]);

  const refreshData = () => {
    if (user && profile) {
      setLoadingChoirs(true);
      const fetchMemberData = async () => {
        try {
          const { data: memberData, error: memberError } = await supabase
            .from('choir_members')
            .select(`
              choir_id,
              choirs (*)
            `)
            .eq('user_id', user.id);

          if (memberError) throw memberError;
          
          const memberChoirsList = memberData?.map((membership: ChoirMembership) => membership.choirs) || [];
          setMemberChoirs(memberChoirsList);
        } catch (error) {
          console.error('Error refreshing data:', error);
        } finally {
          setLoadingChoirs(false);
        }
      };
      fetchMemberData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user || profile?.role !== 'member') {
    return <Navigate to="/auth" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <header className="border-b border-accent/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">ChoraLib</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.full_name || 'Member'}</p>
              <Badge variant="secondary">Member</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">
            Access your choir partitions and practice materials.
          </p>
        </div>

        {/* My Choirs */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">My Choirs</h2>
            <JoinChoirDialog onChoirJoined={refreshData} />
          </div>
          
          {loadingChoirs ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-accent rounded w-3/4"></div>
                    <div className="h-3 bg-accent/60 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-accent/40 rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : memberChoirs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memberChoirs.map((choir) => (
                <Card key={choir.id} className="hover:shadow-elegant transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {choir.name}
                    </CardTitle>
                    <CardDescription>
                      Code: <span className="font-mono font-semibold">{choir.code}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {choir.description || 'No description available'}
                    </p>
                    <Link to={`/partitions/${choir.id}`}>
                      <Button size="sm" className="w-full">
                        View Partitions
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No choir memberships</h3>
                <p className="text-muted-foreground mb-4">
                  Join a choir using an invitation code to access partitions and practice materials
                </p>
                <JoinChoirDialog onChoirJoined={refreshData}>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Join Your First Choir
                  </Button>
                </JoinChoirDialog>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Recent Partitions */}
        {recentPartitions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Recent Partitions</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentPartitions.slice(0, 6).map((partition: any) => (
                <Card key={partition.id} className="hover:shadow-elegant transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{partition.title}</CardTitle>
                    <CardDescription>
                      {partition.composer && `by ${partition.composer}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{partition.voice_type}</Badge>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Heart className="h-3 w-3" />
                        </Button>
                        <Button size="sm">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link to="/partitions">
              <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <BookOpen className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Browse Partitions</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore all available sheet music
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/favorites">
              <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <Heart className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">My Favorites</h3>
                  <p className="text-sm text-muted-foreground">
                    View your saved partitions
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/downloads">
              <Card className="hover:shadow-elegant transition-shadow cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <Download className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold mb-1">Download History</h3>
                  <p className="text-sm text-muted-foreground">
                    See your recent downloads
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MemberDashboard;