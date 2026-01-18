import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Profile, UserRole, Branch } from '@/types/pos';

// Sign up new user
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Sign in user
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Sign out
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Get current user
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// Get user profile
export async function getUserProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

// Get user roles
export async function getUserRoles(): Promise<AppRole[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (error) throw error;
  return (data || []).map(r => r.role as AppRole);
}

// Check if user has specific role
export async function hasRole(role: AppRole): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes(role);
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

// Check if user is manager or admin
export async function isManagerOrAdmin(): Promise<boolean> {
  const roles = await getUserRoles();
  return roles.includes('admin') || roles.includes('manager');
}

// Get user's branch
export async function getUserBranch(): Promise<Branch | null> {
  const profile = await getUserProfile();
  if (!profile?.branch_id) return null;

  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', profile.branch_id)
    .maybeSingle();

  if (error) throw error;
  return data as Branch | null;
}

// Update user profile
export async function updateProfile(
  updates: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>
): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

// Assign user to branch (Admin only)
export async function assignUserToBranch(
  userId: string,
  branchId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ branch_id: branchId })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

// Assign role to user (Admin only)
export async function assignRole(
  userId: string,
  role: AppRole
): Promise<UserRole> {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) throw error;
  return data as UserRole;
}

// Remove role from user (Admin only)
export async function removeRole(
  userId: string,
  role: AppRole
): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) throw error;
}

// Listen to auth state changes
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

// Get all branches (for admin assignment)
export async function getAllBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as Branch[];
}
