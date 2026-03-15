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

interface Choir {
  id: string;
  name: string;
  description: string | null;
  choir_code: string;
  admin_id: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  profiles: { full_name: string | null; email: string };
}

interface Partition {
  id: string;
  title: string;
  composer: string | null;
  category: string | null;
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

  useEffect(() => { if (choirId && user) loadChoirData(); }, [choirId, user]);

  const loadChoirData = async () => {
    try {
      setLoading(true);
      const { data: choirData, error: choirError } = await supabase
        .from('choirs').select('*').eq('id', choirId).eq('admin_id', user?.id).single();
      if (choirError) throw choirError;
      const c = choirData as any;
      setChoir(c);
      setEditForm({ name: c.name, description: c.description || '' });

      const { data: membersData } = await supabase
        .from('choir_members').select('id, user_id, joined_at').eq('choir_id', choirId);
      const memberIds = membersData?.map((m: any) => m.user_id) || [];
      const { data: profilesData } = memberIds.length > 0
        ? await supabase.from('profiles').select('user_id, full_name, email').in('user_id', memberIds)
        : { data: [] };
      const membersWithProfiles = (membersData || []).map((member: any) => ({
        ...member,
        profiles: (profilesData as any[])?.find((p: any) => p.user_id === member.user_id) || { full_name: 'Unknown', email: 'Unknown' }
      }));
      setMembers(membersWithProfiles);

      const { data: partitionsData } = await supabase
        .from('partitions').select('id, title, composer, category, created_at').eq('choir_id', choirId).order('created_at', { ascending: false });
      setPartitions((partitionsData || []) as any);
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
      const { error } = await supabase.from('choirs').update({ name: editForm.name, description: editForm.description } as any).eq('id', choirId);
      if (error) throw error;
      setChoir(prev => prev ? { ...prev, name: editForm.name, description: editForm.description } : null);
      setEditMode(false);
      toast.success('Choir updated successfully');
    } catch (error) { toast.error('Failed to update choir'); }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('choir_members').delete().eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed successfully');
    } catch (error) { toast.error('Failed to remove member'); }
  };

  const handleDeleteChoir = async () => {
    if (!confirm('Are you sure you want to delete this choir?')) return;
    try {
      const { error } = await supabase.from('choirs').delete().eq('id', choirId);
      if (error) throw error;
      toast.success('Choir deleted successfully');
      navigate('/dashboard');
    } catch (error) { toast.error('Failed to delete choir'); }
  };

  if (loading) return <div className="min-h-screen bg-background p-4"><div className="max-w-4xl mx-auto text-center py-8">Loading choir data...</div></div>;
  if (!choir) return <div className="min-h-screen bg-background p-4"><div className="max-w-4xl mx-auto text-center py-8">Choir not found</div></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard</Button>
          <h1 className="text-3xl font-bold">Manage Choir</h1>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Choir Details</CardTitle>
            <div className="flex gap-2">
              {editMode ? (<><Button onClick={handleUpdateChoir}>Save Changes</Button><Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button></>) : (<Button onClick={() => setEditMode(true)}>Edit</Button>)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <><div><label className="text-sm font-medium">Choir Name</label><Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Description</label><Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div></>
            ) : (
              <><div><h3 className="text-xl font-semibold">{choir.name}</h3><p className="text-muted-foreground">{choir.description || 'No description'}</p></div><div><Badge variant="outline">Code: {choir.choir_code}</Badge></div></>
            )}
            <div className="flex justify-end pt-4 border-t"><Button variant="destructive" onClick={handleDeleteChoir}><Trash2 className="h-4 w-4 mr-2" />Delete Choir</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Members ({members.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.length === 0 ? <p className="text-muted-foreground text-center py-4">No members yet</p> : members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div><p className="font-medium">{member.profiles?.full_name || 'Unknown'}</p><p className="text-sm text-muted-foreground">{member.profiles?.email}</p><p className="text-xs text-muted-foreground">Joined: {new Date(member.joined_at).toLocaleDateString()}</p></div>
                  <Button variant="outline" size="sm" onClick={() => handleRemoveMember(member.id)}><UserMinus className="h-4 w-4 mr-2" />Remove</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Music className="h-5 w-5" />Partitions ({partitions.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {partitions.length === 0 ? <p className="text-muted-foreground text-center py-4">No partitions uploaded yet</p> : partitions.slice(0, 5).map(partition => (
                <div key={partition.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div><p className="font-medium">{partition.title}</p><p className="text-sm text-muted-foreground">{partition.composer} • {partition.category || 'general'}</p></div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/partition/${partition.id}`)}>View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChoirManagement;
