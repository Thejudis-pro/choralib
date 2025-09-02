import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Users, Music, Trash2, UserMinus, Settings } from 'lucide-react';
// import InviteUserDialog from '@/components/InviteUserDialog';

interface Choir {
  id: string;
  name: string;
  description: string;
  code: string;
  admin_id: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Partition {
  id: string;
  title: string;
  composer: string;
  voice_type: string;
  created_at: string;
}

const ChoirManagement = () => {
  const { choirId } = useParams<{ choirId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [choir, setChoir] = useState<Choir | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (choirId && user) {
      loadChoirData();
    }
  }, [choirId, user]);

  const loadChoirData = async () => {
    try {
      setLoading(true);
      
      // Load choir details
      const { data: choirData, error: choirError } = await supabase
        .from('choirs')
        .select('*')
        .eq('id', choirId)
        .eq('admin_id', user?.id)
        .single();

      if (choirError) throw choirError;
      setChoir(choirData);
      setEditForm({ name: choirData.name, description: choirData.description || '' });

      // Load members - simplified for now
      const { data: membersData, error: membersError } = await supabase
        .from('choir_members')
        .select('id, user_id, joined_at')
        .eq('choir_id', choirId);

      if (membersError) throw membersError;
      
      // Get profile data separately 
      const memberIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', memberIds);

      // Merge the data
      const membersWithProfiles = membersData?.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.user_id === member.user_id) || { full_name: 'Unknown', email: 'Unknown' }
      })) || [];
      
      setMembers(membersWithProfiles);

      // Load partitions
      const { data: partitionsData, error: partitionsError } = await supabase
        .from('partitions')
        .select('id, title, composer, voice_type, created_at')
        .eq('choir_id', choirId)
        .order('created_at', { ascending: false });

      if (partitionsError) throw partitionsError;
      setPartitions(partitionsData || []);

    } catch (error) {
      console.error('Error loading choir data:', error);
      toast.error('Failed to load choir data');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChoir = async () => {
    try {
      const { error } = await supabase
        .from('choirs')
        .update({
          name: editForm.name,
          description: editForm.description
        })
        .eq('id', choirId);

      if (error) throw error;
      
      setChoir(prev => prev ? { ...prev, name: editForm.name, description: editForm.description } : null);
      setEditMode(false);
      toast.success('Choir updated successfully');
    } catch (error) {
      console.error('Error updating choir:', error);
      toast.error('Failed to update choir');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('choir_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteChoir = async () => {
    if (!confirm('Are you sure you want to delete this choir? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('choirs')
        .delete()
        .eq('id', choirId);

      if (error) throw error;
      
      toast.success('Choir deleted successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting choir:', error);
      toast.error('Failed to delete choir');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading choir data...</div>
        </div>
      </div>
    );
  }

  if (!choir) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Choir not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Manage Choir</h1>
        </div>

        {/* Choir Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Choir Details
            </CardTitle>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button onClick={handleUpdateChoir}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                </>
              ) : (
                <Button onClick={() => setEditMode(true)}>Edit</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <>
                <div>
                  <label className="text-sm font-medium">Choir Name</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-semibold">{choir.name}</h3>
                  <p className="text-muted-foreground">{choir.description || 'No description'}</p>
                </div>
                <div>
                  <Badge variant="outline">Code: {choir.code}</Badge>
                </div>
              </>
            )}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="destructive" onClick={handleDeleteChoir}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Choir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Members Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </CardTitle>
            <Button variant="outline" size="sm">
              Add Members
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No members yet</p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{member.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Partitions Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Partitions ({partitions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {partitions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No partitions uploaded yet</p>
              ) : (
                partitions.slice(0, 5).map((partition) => (
                  <div key={partition.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{partition.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {partition.composer} • {partition.voice_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {new Date(partition.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/partition/${partition.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))
              )}
              {partitions.length > 5 && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/partitions/${choirId}`)}
                  >
                    View All Partitions
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChoirManagement;