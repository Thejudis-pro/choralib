import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription_active: boolean;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName?: string, role?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  refreshProfile: (targetUser?: User) => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeRole = (role: unknown): 'admin' | 'member' => {
  return role === 'admin' ? 'admin' : 'member';
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const createProfileForUser = useCallback(async (targetUser: User) => {
    const fallbackRole = normalizeRole(targetUser.user_metadata?.role);
    const fallbackName = typeof targetUser.user_metadata?.full_name === 'string'
      ? targetUser.user_metadata.full_name
      : null;

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: targetUser.id,
        email: targetUser.email || `${targetUser.id}@local.user`,
        full_name: fallbackName,
        role: fallbackRole,
        subscription_active: false,
      } as any)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating fallback profile:', error);
      return null;
    }

    const createdProfile = data as Profile;
    setProfile(createdProfile);
    return createdProfile;
  }, []);

  const refreshProfile = useCallback(async (targetUser?: User) => {
    if (!targetUser) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      const existingProfile = (data?.[0] ?? null) as Profile | null;
      if (existingProfile) {
        setProfile(existingProfile);
        return existingProfile;
      }

      return await createProfileForUser(targetUser);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      return null;
    }
  }, [createProfileForUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          await refreshProfile(nextSession.user);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    const initializeSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await refreshProfile(currentSession.user);
      }

      setLoading(false);
    };

    initializeSession();

    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string, role: string = 'member') => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || '', role },
        }
      });

      if (authError) return { error: authError };

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email,
            full_name: fullName || '',
            role,
            subscription_active: false,
          } as any);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error: error as any };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value = {
    user, session, profile, loading,
    signIn, signUp, signOut, refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
