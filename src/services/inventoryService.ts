import { supabase } from '@/integrations/supabase/client';
import type { Inventory, MenuItem } from '@/types/pos';

export interface InventoryHistoryEntry {
  id: string;
  inventory_id: string;
  branch_id: string;
  changed_by: string | null;
  change_type: 'add' | 'set' | 'deduct' | 'refund' | 'threshold' | 'initial';
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  reason: string | null;
  created_at: string;
  // Joined data
  menu_item_name?: string;
  changed_by_name?: string;
}

// Get all inventory items for branch
export async function getInventory(): Promise<Inventory[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      menu_item:menu_items(id, name, price, image_url, is_available)
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as Inventory[];
}

// Get low stock items
export async function getLowStockItems(): Promise<Inventory[]> {
  const allInventory = await getInventory();
  return allInventory.filter(item => item.quantity <= item.low_stock_threshold);
}

// Get inventory for specific menu item
export async function getMenuItemInventory(menuItemId: string): Promise<Inventory | null> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      menu_item:menu_items(id, name, price, image_url, is_available)
    `)
    .eq('menu_item_id', menuItemId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as Inventory | null;
}

// Record inventory change in history
async function recordInventoryHistory(
  inventoryId: string,
  branchId: string,
  changeType: InventoryHistoryEntry['change_type'],
  quantityBefore: number,
  quantityAfter: number,
  reason?: string
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('inventory_history')
    .insert({
      inventory_id: inventoryId,
      branch_id: branchId,
      changed_by: userData.user?.id || null,
      change_type: changeType,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      quantity_change: quantityAfter - quantityBefore,
      reason,
    });

  if (error) {
    console.error('Failed to record inventory history:', error);
  }
}

// Update inventory quantity (Manager/Admin only)
export async function updateInventoryQuantity(
  inventoryId: string,
  quantity: number,
  reason?: string
): Promise<Inventory> {
  // Get current quantity first
  const { data: current } = await supabase
    .from('inventory')
    .select('quantity, branch_id')
    .eq('id', inventoryId)
    .single();

  if (!current) throw new Error('Inventory item not found');

  const { data, error } = await supabase
    .from('inventory')
    .update({ 
      quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventoryId)
    .select(`
      *,
      menu_item:menu_items(id, name, price, image_url, is_available)
    `)
    .single();

  if (error) throw error;

  // Record history
  await recordInventoryHistory(
    inventoryId,
    current.branch_id,
    'set',
    current.quantity,
    quantity,
    reason || 'Manual quantity update'
  );

  return data as unknown as Inventory;
}

// Add stock to inventory
export async function addStock(
  inventoryId: string,
  addQuantity: number,
  reason?: string
): Promise<Inventory> {
  const { data: current } = await supabase
    .from('inventory')
    .select('quantity, branch_id')
    .eq('id', inventoryId)
    .single();

  if (!current) throw new Error('Inventory item not found');

  const newQuantity = current.quantity + addQuantity;
  
  const { data, error } = await supabase
    .from('inventory')
    .update({ 
      quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventoryId)
    .select(`
      *,
      menu_item:menu_items(id, name, price, image_url, is_available)
    `)
    .single();

  if (error) throw error;

  // Record history
  await recordInventoryHistory(
    inventoryId,
    current.branch_id,
    'add',
    current.quantity,
    newQuantity,
    reason || `Added ${addQuantity} units`
  );

  return data as unknown as Inventory;
}

// Set low stock threshold
export async function setLowStockThreshold(
  inventoryId: string,
  threshold: number
): Promise<Inventory> {
  const { data: current } = await supabase
    .from('inventory')
    .select('quantity, low_stock_threshold, branch_id')
    .eq('id', inventoryId)
    .single();

  if (!current) throw new Error('Inventory item not found');

  const { data, error } = await supabase
    .from('inventory')
    .update({ 
      low_stock_threshold: threshold,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventoryId)
    .select(`
      *,
      menu_item:menu_items(id, name, price, image_url, is_available)
    `)
    .single();

  if (error) throw error;

  // Record history for threshold change
  await recordInventoryHistory(
    inventoryId,
    current.branch_id,
    'threshold',
    current.low_stock_threshold || 10,
    threshold,
    `Threshold changed from ${current.low_stock_threshold || 10} to ${threshold}`
  );

  return data as unknown as Inventory;
}

// Create inventory entry for menu item
export async function createInventoryEntry(
  menuItemId: string,
  quantity: number = 0,
  lowStockThreshold: number = 10
): Promise<Inventory> {
  // Get user's branch
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!profile?.branch_id) throw new Error('User not assigned to a branch');

  const { data, error } = await supabase
    .from('inventory')
    .insert({
      branch_id: profile.branch_id,
      menu_item_id: menuItemId,
      quantity,
      low_stock_threshold: lowStockThreshold,
    })
    .select(`
      *,
      menu_item:menu_items(id, name, price, image_url, is_available)
    `)
    .single();

  if (error) throw error;

  // Record initial history
  await recordInventoryHistory(
    data.id,
    profile.branch_id,
    'initial',
    0,
    quantity,
    'Initial inventory entry'
  );

  return data as unknown as Inventory;
}

// Check if menu item is in stock
export async function isInStock(menuItemId: string): Promise<boolean> {
  const inventory = await getMenuItemInventory(menuItemId);
  return inventory ? inventory.quantity > 0 : true; // If no inventory tracking, assume in stock
}

// Get inventory alerts count
export async function getInventoryAlertsCount(): Promise<number> {
  const lowStock = await getLowStockItems();
  return lowStock.length;
}

// Get inventory history for a specific item
export async function getInventoryHistory(
  inventoryId: string,
  limit: number = 50
): Promise<InventoryHistoryEntry[]> {
  const { data, error } = await supabase
    .from('inventory_history')
    .select('*')
    .eq('inventory_id', inventoryId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as InventoryHistoryEntry[];
}

// Get all inventory history for branch
export async function getBranchInventoryHistory(
  limit: number = 100,
  startDate?: string,
  endDate?: string
): Promise<InventoryHistoryEntry[]> {
  let query = supabase
    .from('inventory_history')
    .select(`
      *,
      inventory:inventory(menu_item:menu_items(name))
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Map the nested data
  return (data || []).map((entry: any) => ({
    ...entry,
    menu_item_name: entry.inventory?.menu_item?.name || 'Unknown Item',
  })) as InventoryHistoryEntry[];
}
