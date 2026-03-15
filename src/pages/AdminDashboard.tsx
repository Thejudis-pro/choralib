import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Music, Plus, Users, Crown, LogOut, BarChart3, FileText, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import CreateChoirDialog from '@/components/CreateChoirDialog';
import InviteUserDialog from '@/components/InviteUserDialog';

interface Choir {
  id: string;
  name: string;
  choir_code: string;
  description: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [choirs, setChoirs] = useState<Choir[]>([]);
  const [loadingChoirs, setLoadingChoirs] = useState(true);
  const [stats, setStats] = useState({ totalChoirs: 0, totalMembers: 0, totalPartitions: 0 });

  const fetchAdminData = async () => {
    if (!user) return;
    try {
      const { data: choirsData, error: choirsError } = await supabase
        .from('choirs')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (choirsError) throw choirsError;
      setChoirs((choirsData || []) as any);

      const choirIds = choirsData?.map((c: any) => c.id) || [];
      let totalMembers = 0;
      let totalPartitions = 0;
      if (choirIds.length > 0) {
        const { count: mc } = await supabase.from('choir_members').select('*', { count: 'exact', head: true }).in('choir_id', choirIds);
        totalMembers = mc || 0;
        const { count: pc } = await supabase.from('partitions').select('*', { count: 'exact', head: true }).in('choir_id', choirIds);
        totalPartitions = pc || 0;
      }
      setStats({ totalChoirs: choirsData?.length || 0, totalMembers, totalPartitions });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
    } finally {
      setLoadingChoirs(false);
    }
  };

  useEffect(() => {
    if (user && profile) { fetchAdminData(); }
  }, [user, profile]);

  const refreshData = () => { setLoadingChoirs(true); fetchAdminData(); };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div></div>;
  }
  if (!user || profile?.role !== 'admin') return <Navigate to="/auth" replace />;

  const handleSignOut = async () => { await signOut(); toast({ title: "Signed out", description: "You have been successfully signed out." }); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <header className="border-b border-accent/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2"><Music className="h-8 w-8 text-primary" /><span className="text-2xl font-bold">ChoraLib Admin</span></div>
          <div className="flex items-center gap-4">
            <InviteUserDialog onUserInvited={refreshData}><Button variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-2" />Invite User</Button></InviteUserDialog>
            <div className="text-right">
              <p className="text-sm font-medium">{profile?.full_name || 'Admin'}</p>
              <div className="flex items-center gap-2">
                <Badge variant="default"><Crown className="h-3 w-3 mr-1" />Admin</Badge>
                <Badge variant={profile?.subscription_active ? 'default' : 'destructive'}>{profile?.subscription_active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2"><h1 className="text-3xl font-bold">Admin Dashboard</h1><p className="text-muted-foreground">Manage your choirs, members, and music library.</p></div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Choirs</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalChoirs}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Members</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalMembers}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Partitions</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalPartitions}</div></CardContent></Card>
        </div>

        <section className="space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-2xl font-semibold">Your Choirs</h2><CreateChoirDialog onChoirCreated={refreshData} /></div>
          {loadingChoirs ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i=><Card key={i} className="animate-pulse"><CardHeader><div className="h-4 bg-accent rounded w-3/4"></div></CardHeader></Card>)}</div>
          ) : choirs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {choirs.map(choir => (
                <Card key={choir.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{choir.name}</CardTitle>
                    <CardDescription>Code: <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-1 rounded">{choir.choir_code}</span></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{choir.description || 'No description available'}</p>
                    <div className="bg-muted/50 p-3 rounded-lg mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Share this code with potential members:</p>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-lg font-bold text-primary bg-background px-3 py-2 rounded border">{choir.choir_code}</code>
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(choir.choir_code); toast({ title: "Code copied!", description: "Choir code copied to clipboard" }); }}>Copy</Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/choir-management/${choir.id}`}><Button size="sm" variant="outline">Manage</Button></Link>
                      <Link to={`/partitions/${choir.id}`}><Button size="sm" variant="outline">View Partitions</Button></Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center p-8 text-center"><Users className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">No choirs yet</h3><p className="text-muted-foreground mb-4">Create your first choir to start managing partitions and members</p><CreateChoirDialog onChoirCreated={refreshData}><Button><Plus className="h-4 w-4 mr-2" />Create Your First Choir</Button></CreateChoirDialog></CardContent></Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
