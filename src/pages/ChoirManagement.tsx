import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Users, 
  Music, 
  Edit, 
  Trash2, 
  UserPlus, 
  Eye, 
  Download,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import InviteUserDialog from '@/components/InviteUserDialog';
import { partitionService } from '@/lib/partitionService';

interface Choir {
  id: string;
  name: string;
  description: string | null;
  code: string;
  admin_id: string;
  created_at: string;
}

interface ChoirMember {
  id: string;
  user_id: string;
  choir_id: string;
  joined_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface Partition {
  id: string;
  title: string;
  composer: string | null;
  created_at: string;
}

interface PartitionAnalytics {
  totalPartitions: number;
  totalViews: number;
  totalDownloads: number;
  mostViewedPartitions: Array<{
    id: string;
    title: string;
    views: number;
    downloads: number;
  }>;
}

const ChoirManagement = () => {
  const { choirId } = useParams<{ choirId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [choir, setChoir] = useState<Choir | null>(null);
  const [members, setMembers] = useState<ChoirMember[]>([]);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [analytics, setAnalytics] = useState<PartitionAnalytics | null>(null);

  useEffect(() => {
    if (!choirId || !user) return;

    const fetchChoirData = async () => {
      try {
        setLoading(true);

        // Fetch choir details
        const { data: choirData, error: choirError } = await supabase
          .from('choirs')
          .select('*')
          .eq('id', choirId)
          .single();

        if (choirError) throw choirError;

        // Check if user is admin of this choir
        if (choirData.admin_id !== user.id) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to manage this choir",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }

        setChoir(choirData);
        setEditForm({
          name: choirData.name,
          description: choirData.description || ''
        });

        // Fetch choir members
        const { data: membersData, error: membersError } = await supabase
          .from('choir_members')
          .select('*') // Changed from `*, profiles (full_name, email)`
          .eq('choir_id', choirId);

        if (membersError) throw membersError;

        // Fetch profile information for each member (Manual join to fix type error)
        if (membersData && membersData.length > 0) {
          const userIds = membersData.map(member => member.user_id);
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, email')
            .in('user_id', userIds);

          if (profilesError) throw profilesError;

          // Combine member data with profile data
          const membersWithProfiles = membersData.map(member => {
            const profile = profilesData?.find(p => p.user_id === member.user_id);
            return {
              ...member,
              profiles: {
                full_name: profile?.full_name || null,
                email: profile?.email || 'Unknown'
              }
            };
          });

          setMembers(membersWithProfiles);
        } else {
          setMembers([]);
        }

        // Fetch choir partitions
        const { data: partitionsData, error: partitionsError } = await supabase
          .from('partitions')
          .select('*')
          .eq('choir_id', choirId)
          .order('created_at', { ascending: false });

        if (partitionsError) throw partitionsError;
        setPartitions(partitionsData || []);

        // Fetch partition analytics
        const partitionAnalytics = await partitionService.getPartitionAnalytics(choirId);
        setAnalytics(partitionAnalytics);

      } catch (error) {
        console.error('Error fetching choir data:', error);
        toast({
          title: "Error",
          description: "Failed to load choir data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchChoirData();
  }, [choirId, user, navigate]);

  const handleEditChoir = async () => {
    if (!choir) return;

    try {
      const { error } = await supabase
        .from('choirs')
        .update({
          name: editForm.name,
          description: editForm.description
        })
        .eq('id', choir.id);

      if (error) throw error;

      setChoir(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
      toast({
        title: "Success",
        description: "Choir details updated successfully",
      });
    } catch (error) {
      console.error('Error updating choir:', error);
      toast({
        title: "Error",
        description: "Failed to update choir details",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('choir_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(member => member.id !== memberId));
      toast({
        title: "Success",
        description: "Member removed from choir",
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading choir data...</p>
        </div>
      </div>
    );
  }

  if (!choir) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Choir not found</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{choir.name}</h1>
              <p className="text-muted-foreground">Choir Management</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Choir
            </Button>
            <InviteUserDialog onUserInvited={() => window.location.reload()}>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </InviteUserDialog>
          </div>
        </div>

        {/* Choir Code Sharing Section */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Share Choir Code</h3>
                <p className="text-muted-foreground mb-3">
                  Share this code with potential members so they can join your choir
                </p>
                <div className="flex items-center gap-3">
                  <code className="font-mono text-2xl font-bold text-primary bg-background px-4 py-3 rounded-lg border-2 border-primary/30">
                    {choir.code}
                  </code>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(choir.code);
                      toast({
                        title: "Code copied!",
                        description: "Choir code copied to clipboard",
                      });
                    }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Copy Code
                  </Button>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Members can join by:</p>
                <p>1. Going to their dashboard</p>
                <p>2. Clicking "Join Choir"</p>
                <p>3. Entering this code</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">
                Active choir members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Partitions</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{partitions.length}</div>
              <p className="text-xs text-muted-foreground">
                Available partitions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalViews || 0}</div>
              <p className="text-xs text-muted-foreground">
                Partition views
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalDownloads || 0}</div>
              <p className="text-xs text-muted-foreground">
                Partition downloads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Partition Analytics */}
        {analytics && analytics.mostViewedPartitions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Partition Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="font-medium">Most Viewed Partitions</h4>
                <div className="space-y-2">
                  {analytics.mostViewedPartitions.map((partition) => (
                    <div key={partition.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{partition.title}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {partition.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {partition.downloads} downloads
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/partition/${partition.id}`}>View</a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Choir Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No members yet. Invite people to join your choir!
              </p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.profiles.full_name || 'Unknown Name'}</p>
                      <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Partitions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Recent Partitions ({partitions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partitions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No partitions uploaded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {partitions.slice(0, 5).map((partition) => (
                  <div key={partition.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{partition.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {partition.composer && `by ${partition.composer}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(partition.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/partition/${partition.id}`}>View</a>
                    </Button>
                  </div>
                ))}
                {partitions.length > 5 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" asChild>
                      <a href={`/partitions/${choir.id}`}>View All Partitions</a>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Choir Dialog */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Edit Choir</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Choir Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border rounded-md mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border rounded-md mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEditChoir} className="flex-1">
                    Save Changes
                  </Button>
                  <Button onClick={() => setEditing(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChoirManagement;
