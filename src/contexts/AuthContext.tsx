import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile } from '@/types/pos';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPin: (pin: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: () => boolean;
  isManagerOrAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (profileData) setProfile(profileData as Profile);
    const { data: rolesData } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (rolesData) setRoles(rolesData.map(r => r.role as AppRole));
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) setTimeout(() => fetchUserData(session.user.id), 0);
      else { setProfile(null); setRoles([]); }
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithPin = async (pin: string) => {
    try {
      // Call the edge function to validate PIN and get auth token
      const { data, error: invokeError } = await supabase.functions.invoke('pin-login', {
        body: { pin }
      });

      if (invokeError) {
        return { error: new Error(invokeError.message || 'PIN login failed') };
      }

      if (data?.error) {
        return { error: new Error(data.error) };
      }

      if (!data?.token) {
        return { error: new Error('No authentication token received') };
      }

      // Use the token to verify OTP (magic link token)
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token,
        type: 'magiclink',
      });

      if (verifyError) {
        return { error: new Error(verifyError.message || 'Failed to authenticate') };
      }

      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || 'PIN login failed') };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName } } });
    if (!error && data.user) await supabase.from('profiles').insert({ user_id: data.user.id, full_name: fullName });
    return { error: error as Error | null };
  };

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setSession(null); setProfile(null); setRoles([]); };
  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = () => hasRole('admin');
  const isManagerOrAdmin = () => hasRole('manager') || hasRole('admin');

  return <AuthContext.Provider value={{ user, session, profile, roles, loading, signIn, signInWithPin, signUp, signOut, hasRole, isAdmin, isManagerOrAdmin }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
