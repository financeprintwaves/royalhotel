import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Branch, Profile } from '@/types/pos';

export interface StaffMember {
  user_id: string;
  email: string | null;
  full_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  roles: AppRole[];
  created_at: string;
}

// Get all staff members with their roles (admin only)
export async function getStaffWithRoles(): Promise<StaffMember[]> {
  const { data, error } = await supabase.rpc('get_staff_with_roles');

  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...s,
    roles: (s.roles || []) as AppRole[],
  }));
}

// Get all branches
export async function getAllBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as Branch[];
}

// Assign role to user (admin only)
export async function assignRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('User already has this role');
    }
    throw error;
  }
}

// Remove role from user (admin only)
export async function removeRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) throw error;
}

// Assign user to branch (admin only)
export async function assignUserToBranch(userId: string, branchId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ branch_id: branchId })
    .eq('user_id', userId);

  if (error) throw error;
}

// Update profile email (for staff management)
export async function updateProfileEmail(userId: string, email: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ email })
    .eq('user_id', userId);

  if (error) throw error;
}

// Get user's profile by user ID
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

// Create a new branch (admin only)
export async function createBranch(name: string, address?: string, phone?: string): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .insert({ name, address, phone })
    .select()
    .single();

  if (error) throw error;
  return data as Branch;
}

// Update branch (admin only)
export async function updateBranch(
  branchId: string,
  updates: Partial<Pick<Branch, 'name' | 'address' | 'phone' | 'is_active'>>
): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .update(updates)
    .eq('id', branchId)
    .select()
    .single();

  if (error) throw error;
  return data as Branch;
}

// Deactivate branch (admin only)
export async function deactivateBranch(branchId: string): Promise<void> {
  const { error } = await supabase
    .from('branches')
    .update({ is_active: false })
    .eq('id', branchId);

  if (error) throw error;
}
