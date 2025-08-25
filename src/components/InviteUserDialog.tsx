import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface InviteUserDialogProps {
  onUserInvited?: () => void;
  children?: React.ReactNode;
}

const InviteUserDialog = ({ onUserInvited, children }: InviteUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Use admin API to invite user
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: email.split('@')[0], // Use email prefix as default name
          role: role
        },
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) {
        console.error('Invite error:', error);
        toast({
          title: 'Invitation failed',
          description: error.message || 'Failed to send invitation',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Invitation sent!',
        description: `Invitation email sent to ${email}. They can set their password when they click the link.`,
      });

      setOpen(false);
      setEmail('');
      setRole('member');
      onUserInvited?.();
    } catch (error: any) {
      console.error('Invite error:', error);
      toast({
        title: 'Invitation failed',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Send an invitation email to a new user. They'll receive a link to set their password and join the platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-3">
            <Label>User Role</Label>
            <RadioGroup value={role} onValueChange={(value: 'admin' | 'member') => setRole(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member">Member - Can join choirs and access partitions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="admin" />
                <Label htmlFor="admin">Admin - Can create choirs and manage content</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;