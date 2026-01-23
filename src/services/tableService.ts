import { supabase } from '@/integrations/supabase/client';
import type { RestaurantTable, TableStatus, TableType } from '@/types/pos';

// Get all tables for branch (optionally filter by branchId)
export async function getTables(branchId?: string): Promise<RestaurantTable[]> {
  let query = supabase
    .from('restaurant_tables')
    .select('*')
    .eq('is_active', true)
    .order('table_number', { ascending: true });
  
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
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
  capacity: number = 4,
  tableType: TableType = 'dining',
  branchId?: string // Optional branch override for admins viewing other branches
): Promise<RestaurantTable> {
  const normalizedTableNumber = (() => {
    const trimmed = (tableNumber || '').trim();
    // If user typed only a number, standardize to the common T{n} format.
    if (/^\d+$/.test(trimmed)) return `T${trimmed}`;
    return trimmed;
  })();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  // Use provided branchId OR fall back to user's assigned branch
  let targetBranchId = branchId;
  
  if (!targetBranchId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('branch_id')
      .eq('user_id', userData.user.id)
      .single();
    targetBranchId = profile?.branch_id ?? undefined;
  }

  if (!targetBranchId) throw new Error('No branch specified');

  const { data, error } = await supabase
    .from('restaurant_tables')
    .insert({
      branch_id: targetBranchId,
      table_number: normalizedTableNumber,
      capacity,
      status: 'available',
      table_type: tableType,
    })
    .select()
    .single();

  if (error) throw error;
  return data as RestaurantTable;
}

// Update table details
export async function updateTable(
  tableId: string,
  updates: Partial<Pick<RestaurantTable, 'table_number' | 'capacity' | 'status' | 'position_x' | 'position_y' | 'width' | 'height' | 'shape' | 'table_type' | 'merged_with' | 'is_merged'>>
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

// Update table position (for drag-and-drop)
export async function updateTablePosition(
  tableId: string,
  positionX: number,
  positionY: number
): Promise<RestaurantTable> {
  return updateTable(tableId, { position_x: positionX, position_y: positionY });
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

// Merge tables together
export async function mergeTables(
  primaryTableId: string,
  tableIdsToMerge: string[]
): Promise<RestaurantTable> {
  // Get all tables to calculate combined capacity
  const { data: tables, error: fetchError } = await supabase
    .from('restaurant_tables')
    .select('*')
    .in('id', [primaryTableId, ...tableIdsToMerge]);
  
  if (fetchError) throw fetchError;
  
  const primaryTable = tables?.find(t => t.id === primaryTableId);
  const mergeTables = tables?.filter(t => t.id !== primaryTableId) || [];
  
  if (!primaryTable) throw new Error('Primary table not found');
  
  // Calculate new width for merged tables (visual expansion)
  const totalWidth = (primaryTable.width || 120) + mergeTables.reduce((sum, t) => sum + (t.width || 120) * 0.5, 0);
  
  // Update primary table with merged info
  const { data: updatedPrimary, error: primaryError } = await supabase
    .from('restaurant_tables')
    .update({
      merged_with: tableIdsToMerge,
      is_merged: true,
      width: Math.min(totalWidth, 300), // Cap at 300px
    })
    .eq('id', primaryTableId)
    .select()
    .single();
  
  if (primaryError) throw primaryError;
  
  // Mark merged tables as merged (hide them from view but keep data)
  const { error: mergeError } = await supabase
    .from('restaurant_tables')
    .update({
      is_merged: true,
      status: 'occupied', // Mark as occupied when merged
    })
    .in('id', tableIdsToMerge);
  
  if (mergeError) throw mergeError;
  
  return updatedPrimary as RestaurantTable;
}

// Split merged tables back to individual
export async function splitTables(tableId: string): Promise<void> {
  // Get the table with its merged_with info
  const { data: table, error: fetchError } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('id', tableId)
    .single();
  
  if (fetchError) throw fetchError;
  if (!table) throw new Error('Table not found');
  
  const mergedIds = table.merged_with || [];
  
  // Reset primary table
  const { error: primaryError } = await supabase
    .from('restaurant_tables')
    .update({
      merged_with: [],
      is_merged: false,
      width: 120, // Reset to default
    })
    .eq('id', tableId);
  
  if (primaryError) throw primaryError;
  
  // Reset merged tables
  if (mergedIds.length > 0) {
    const { error: mergeError } = await supabase
      .from('restaurant_tables')
      .update({
        is_merged: false,
        status: 'available',
      })
      .in('id', mergedIds);
    
    if (mergeError) throw mergeError;
  }
}
