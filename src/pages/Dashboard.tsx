import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Music, Plus, Users, BookOpen, Crown, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [choirs, setChoirs] = useState<Choir[]>([]);
  const [memberChoirs, setMemberChoirs] = useState<Choir[]>([]);
  const [loadingChoirs, setLoadingChoirs] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;

    const fetchChoirs = async () => {
      try {
        if (profile.role === 'admin') {
          // Fetch choirs owned by this admin
          const { data, error } = await supabase
            .from('choirs')
            .select('*')
            .eq('admin_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setChoirs(data || []);
        }

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
      } catch (error) {
        console.error('Error fetching choirs:', error);
        toast({
          title: "Error",
          description: "Failed to load choirs",
          variant: "destructive",
        });
      } finally {
        setLoadingChoirs(false);
      }
    };

    fetchChoirs();
  }, [user, profile]);

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
              <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
              <div className="flex items-center gap-2">
                <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'}>
                  {profile?.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                  {profile?.role || 'Member'}
                </Badge>
                {profile?.role === 'admin' && (
                  <Badge variant={profile?.subscription_active ? 'default' : 'destructive'}>
                    {profile?.subscription_active ? 'Active' : 'Inactive'}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your choirs.
          </p>
        </div>

        {profile?.role === 'admin' && (
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Your Choirs</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Choir
              </Button>
            </div>

            {loadingChoirs ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
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
            ) : choirs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {choirs.map((choir) => (
                  <Card key={choir.id} className="hover:shadow-elegant transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {choir.name}
                      </CardTitle>
                      <CardDescription>
                        Code: <span className="font-mono font-semibold">{choir.code}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {choir.description || 'No description available'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No choirs yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first choir to start managing partitions
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Choir
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Choirs You're In</h2>
          
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
                    <p className="text-sm text-muted-foreground">
                      {choir.description || 'No description available'}
                    </p>
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
                  Join a choir using an invitation code or ask your choir master to invite you
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Join Choir
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;