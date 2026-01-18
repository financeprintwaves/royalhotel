import { supabase } from '@/integrations/supabase/client';
import type { Inventory, MenuItem } from '@/types/pos';

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

// Update inventory quantity (Manager/Admin only)
export async function updateInventoryQuantity(
  inventoryId: string,
  quantity: number
): Promise<Inventory> {
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
  return data as unknown as Inventory;
}

// Add stock to inventory
export async function addStock(
  inventoryId: string,
  addQuantity: number
): Promise<Inventory> {
  const { data: current } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('id', inventoryId)
    .single();

  if (!current) throw new Error('Inventory item not found');

  const newQuantity = current.quantity + addQuantity;
  return updateInventoryQuantity(inventoryId, newQuantity);
}

// Set low stock threshold
export async function setLowStockThreshold(
  inventoryId: string,
  threshold: number
): Promise<Inventory> {
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
