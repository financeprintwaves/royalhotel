import { supabase } from '@/integrations/supabase/client';
import type { AppRole, Branch, Profile } from '@/types/pos';

export interface StaffMember {
  user_id: string;
  email: string | null;
  full_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  branch_ids: string[];
  branch_names: string[];
  roles: AppRole[];
  created_at: string;
  staff_pin?: string | null;
}

// Get all staff members with their roles (admin only)
export async function getStaffWithRoles(): Promise<StaffMember[]> {
  const { data, error } = await supabase.rpc('get_staff_with_roles');

  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...s,
    roles: (s.roles || []) as AppRole[],
    branch_ids: (s.branch_ids || []) as string[],
    branch_names: (s.branch_names || []) as string[],
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

// Assign user to branch (admin only) - legacy single branch
export async function assignUserToBranch(userId: string, branchId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ branch_id: branchId })
    .eq('user_id', userId);

  if (error) throw error;
}

// Get all branches for a user
export async function getUserBranches(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_branches')
    .select('branch_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map((d: any) => d.branch_id);
}

// Set branches for a user (replaces all existing)
export async function assignUserBranches(
  userId: string, 
  branchIds: string[]
): Promise<void> {
  // Delete existing assignments
  const { error: deleteError } = await supabase
    .from('user_branches')
    .delete()
    .eq('user_id', userId);
  
  if (deleteError) throw deleteError;
  
  // Insert new assignments
  if (branchIds.length > 0) {
    const inserts = branchIds.map(bid => ({ 
      user_id: userId, 
      branch_id: bid 
    }));
    const { error: insertError } = await supabase
      .from('user_branches')
      .insert(inserts);
    
    if (insertError) throw insertError;
  }
  
  // Update primary branch_id in profiles (first selected branch)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ branch_id: branchIds[0] || null })
    .eq('user_id', userId);

  if (updateError) throw updateError;
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
export async function createBranch(
  name: string, 
  address?: string, 
  phone?: string,
  orderPrefix: string = 'INB'
): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .insert({ name, address, phone, order_prefix: orderPrefix })
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

// Set staff PIN (admin only)
export async function setStaffPin(userId: string, pin: string | null): Promise<void> {
  // Validate PIN format if provided
  if (pin && !/^\d{5}$/.test(pin)) {
    throw new Error('PIN must be exactly 5 digits');
  }
  
  const { error } = await supabase
    .from('profiles')
    .update({ staff_pin: pin })
    .eq('user_id', userId);

  if (error) {
    if (error.code === '23505') {
      throw new Error('This PIN is already in use by another staff member');
    }
    throw error;
  }
}

// Generate a unique 5-digit PIN
export async function generateUniquePin(): Promise<string> {
  // Get all existing PINs
  const { data, error } = await supabase
    .from('profiles')
    .select('staff_pin')
    .not('staff_pin', 'is', null);

  if (error) throw error;

  const existingPins = new Set((data || []).map((p: any) => p.staff_pin));
  
  // Generate random PIN until we find a unique one
  let attempts = 0;
  while (attempts < 1000) {
    const pin = String(Math.floor(10000 + Math.random() * 90000));
    if (!existingPins.has(pin)) {
      return pin;
    }
    attempts++;
  }
  
  throw new Error('Unable to generate unique PIN. Too many PINs in use.');
}

// Get staff PIN (admin only - for display purposes)
export async function getStaffPin(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('staff_pin')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data?.staff_pin || null;
}
