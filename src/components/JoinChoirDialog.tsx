import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface JoinChoirDialogProps {
  onChoirJoined?: () => void;
  children?: React.ReactNode;
}

const JoinChoirDialog = ({ onChoirJoined, children }: JoinChoirDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [choirCode, setChoirCode] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choirCode.trim()) {
      toast({
        title: "Validation Error",
        description: "Choir code is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, find the choir by code
      const { data: choir, error: choirError } = await supabase
        .from('choirs')
        .select('*')
        .eq('code', choirCode.trim().toUpperCase())
        .single();

      if (choirError) {
        if (choirError.code === 'PGRST116') {
          toast({
            title: "Invalid Code",
            description: "No choir found with this code",
            variant: "destructive",
          });
        } else {
          throw choirError;
        }
        return;
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('choir_members')
        .select('*')
        .eq('choir_id', choir.id)
        .eq('user_id', user?.id)
        .single();

      if (existingMembership) {
        toast({
          title: "Already a Member",
          description: "You are already a member of this choir",
          variant: "destructive",
        });
        return;
      }

      // Add user to choir
      const { error: memberError } = await supabase
        .from('choir_members')
        .insert({
          choir_id: choir.id,
          user_id: user?.id
        });

      if (memberError) throw memberError;

      toast({
        title: "Joined Successfully!",
        description: `You are now a member of ${choir.name}`,
      });

      setChoirCode('');
      setOpen(false);
      onChoirJoined?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join choir",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Join Choir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Choir</DialogTitle>
          <DialogDescription>
            Enter the choir code provided by your choir master to join.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="choir-code">Choir Code</Label>
            <Input
              id="choir-code"
              placeholder="Enter 6-character choir code"
              value={choirCode}
              onChange={(e) => setChoirCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="uppercase"
              required
            />
            <p className="text-sm text-muted-foreground">
              Ask your choir master for the choir access code
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Joining...' : 'Join Choir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinChoirDialog;