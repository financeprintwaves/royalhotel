import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile } from '@/types/pos';
import { 
  startSession, 
  getActiveSession, 
  getSessionSummary, 
  endSession,
  SessionSummary,
  PaymentTotals 
} from '@/services/sessionService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  // Session tracking
  currentSessionId: string | null;
  sessionLoginTime: Date | null;
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPin: (pin: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  // Role checks
  hasRole: (role: AppRole) => boolean;
  isAdmin: () => boolean;
  isManagerOrAdmin: () => boolean;
  // Logout flow with summary
  initiateLogout: () => Promise<SessionSummary | null>;
  confirmLogout: (paymentTotals: PaymentTotals) => Promise<void>;
  showLogoutSummary: boolean;
  setShowLogoutSummary: (show: boolean) => void;
  sessionSummary: SessionSummary | null;
  setSessionSummary: (summary: SessionSummary | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Session tracking state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionLoginTime, setSessionLoginTime] = useState<Date | null>(null);
  const [showLogoutSummary, setShowLogoutSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  const fetchUserData = async (userId: string) => {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (profileData) setProfile(profileData as Profile);
    const { data: rolesData } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (rolesData) setRoles(rolesData.map(r => r.role as AppRole));
    return profileData;
  };

  // Initialize or restore session tracking
  const initializeSessionTracking = useCallback(async (userId: string, branchId: string | null) => {
    // Check for existing active session
    const existingSession = await getActiveSession(userId);
    
    if (existingSession) {
      setCurrentSessionId(existingSession.id);
      setSessionLoginTime(new Date(existingSession.login_time));
    } else {
      // Start a new session
      const newSession = await startSession(userId, branchId);
      if (newSession) {
        setCurrentSessionId(newSession.id);
        setSessionLoginTime(new Date(newSession.login_time));
      }
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const profileData = await fetchUserData(session.user.id);
        // Initialize session tracking after profile is loaded
        if (profileData) {
          initializeSessionTracking(session.user.id, profileData.branch_id);
        }
      } else { 
        setProfile(null); 
        setRoles([]); 
        setCurrentSessionId(null);
        setSessionLoginTime(null);
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const profileData = await fetchUserData(session.user.id);
        // Initialize session tracking after profile is loaded
        if (profileData) {
          initializeSessionTracking(session.user.id, profileData.branch_id);
        }
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [initializeSessionTracking]);

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

  const signOut = async () => { 
    setCurrentSessionId(null);
    setSessionLoginTime(null);
    await supabase.auth.signOut(); 
    setUser(null); 
    setSession(null); 
    setProfile(null); 
    setRoles([]); 
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = () => hasRole('admin');
  const isManagerOrAdmin = () => hasRole('manager') || hasRole('admin');

  const initiateLogout = async (): Promise<SessionSummary | null> => {
    if (!user) return null;
    
    const userName = profile?.full_name || user.email || 'Unknown';
    const summary = await getSessionSummary(user.id, userName);
    
    if (summary) {
      setSessionSummary(summary);
      setShowLogoutSummary(true);
    }
    
    return summary;
  };

  const confirmLogout = async (paymentTotals: PaymentTotals) => {
    if (currentSessionId) {
      await endSession(currentSessionId, paymentTotals);
    }
    
    setShowLogoutSummary(false);
    setSessionSummary(null);
    await signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, profile, roles, loading, 
      currentSessionId, sessionLoginTime,
      signIn, signInWithPin, signUp, signOut, 
      hasRole, isAdmin, isManagerOrAdmin,
      initiateLogout, confirmLogout,
      showLogoutSummary, setShowLogoutSummary,
      sessionSummary, setSessionSummary
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
