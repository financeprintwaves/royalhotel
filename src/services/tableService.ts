import { supabase } from '@/integrations/supabase/client';
import type { RestaurantTable, TableStatus } from '@/types/pos';

// Get all tables for branch
export async function getTables(): Promise<RestaurantTable[]> {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('is_active', true)
    .order('table_number', { ascending: true });

  if (error) throw error;
  return (data || []) as RestaurantTable[];
}

// Get available tables only
export async function getAvailableTables(): Promise<RestaurantTable[]> {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'available')
    .order('table_number', { ascending: true });

  if (error) throw error;
  return (data || []) as RestaurantTable[];
}

// Get table by ID
export async function getTable(tableId: string): Promise<RestaurantTable | null> {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('id', tableId)
    .maybeSingle();

  if (error) throw error;
  return data as RestaurantTable | null;
}

// Update table status
export async function updateTableStatus(
  tableId: string,
  status: TableStatus
): Promise<RestaurantTable> {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .update({ status })
    .eq('id', tableId)
    .select()
    .single();

  if (error) throw error;
  return data as RestaurantTable;
}

// Create table (Manager/Admin)
export async function createTable(
  tableNumber: string,
  capacity: number = 4
): Promise<RestaurantTable> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!profile?.branch_id) throw new Error('User not assigned to a branch');

  const { data, error } = await supabase
    .from('restaurant_tables')
    .insert({
      branch_id: profile.branch_id,
      table_number: tableNumber,
      capacity,
      status: 'available',
    })
    .select()
    .single();

  if (error) throw error;
  return data as RestaurantTable;
}

// Update table details
export async function updateTable(
  tableId: string,
  updates: Partial<Pick<RestaurantTable, 'table_number' | 'capacity' | 'status'>>
): Promise<RestaurantTable> {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .update(updates)
    .eq('id', tableId)
    .select()
    .single();

  if (error) throw error;
  return data as RestaurantTable;
}

// Delete table (soft delete)
export async function deleteTable(tableId: string): Promise<void> {
  const { error } = await supabase
    .from('restaurant_tables')
    .update({ is_active: false })
    .eq('id', tableId);

  if (error) throw error;
}

// Set table to available
export async function setTableAvailable(tableId: string): Promise<RestaurantTable> {
  return updateTableStatus(tableId, 'available');
}

// Set table to occupied
export async function setTableOccupied(tableId: string): Promise<RestaurantTable> {
  return updateTableStatus(tableId, 'occupied');
}

// Set table to reserved
export async function setTableReserved(tableId: string): Promise<RestaurantTable> {
  return updateTableStatus(tableId, 'reserved');
}

// Set table to cleaning
export async function setTableCleaning(tableId: string): Promise<RestaurantTable> {
  return updateTableStatus(tableId, 'cleaning');
}

// Get tables by status
export async function getTablesByStatus(status: TableStatus): Promise<RestaurantTable[]> {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('is_active', true)
    .eq('status', status)
    .order('table_number', { ascending: true });

  if (error) throw error;
  return (data || []) as RestaurantTable[];
}

// Get table statistics
export async function getTableStats(): Promise<{
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  cleaning: number;
}> {
  const tables = await getTables();
  
  return {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
  };
}
