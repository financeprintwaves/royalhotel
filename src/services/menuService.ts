import { supabase } from '@/integrations/supabase/client';
import type { Category, MenuItem, BillingType, PortionOption } from '@/types/pos';

// Extended menu item creation options for bar products
export interface CreateMenuItemOptions {
  name: string;
  price: number;
  categoryId?: string;
  description?: string;
  imageUrl?: string;
  bottleSizeMl?: number;
  costPrice?: number;
  servingSizeMl?: number;
  servingPrice?: number;
  billingType?: BillingType;
  portionOptions?: PortionOption[];
}

// Get all categories for branch (with optional branchId for admin cross-branch queries)
export async function getCategories(branchId?: string): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // If branchId specified, filter by it (for admins switching branches)
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Category[];
}

// Get category by ID
export async function getCategory(categoryId: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .maybeSingle();

  if (error) throw error;
  return data as Category | null;
}

// Create category (Manager/Admin)
export async function createCategory(
  name: string,
  description?: string,
  sortOrder?: number
): Promise<Category> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!profile?.branch_id) throw new Error('User not assigned to a branch');

  const { data, error } = await supabase
    .from('categories')
    .insert({
      branch_id: profile.branch_id,
      name,
      description,
      sort_order: sortOrder || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

// Update category
export async function updateCategory(
  categoryId: string,
  updates: Partial<Pick<Category, 'name' | 'description' | 'sort_order' | 'is_active' | 'requires_kitchen'>>
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return data as Category;
}

// Delete category
export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', categoryId);

  if (error) throw error;
}

// Get all menu items for branch (with optional branchId for admin cross-branch queries)
export async function getMenuItems(categoryId?: string, branchId?: string): Promise<MenuItem[]> {
  let query = supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // If branchId specified, filter by it (for admins switching branches)
  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as unknown as MenuItem[];
}

// Get available menu items only
export async function getAvailableMenuItems(categoryId?: string): Promise<MenuItem[]> {
  const items = await getMenuItems(categoryId);
  return items.filter(item => item.is_available);
}

// Get menu item by ID
export async function getMenuItem(menuItemId: string): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('id', menuItemId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as MenuItem | null;
}

// Create menu item (Manager/Admin) - Extended for bar products
export async function createMenuItem(
  name: string,
  price: number,
  categoryId?: string,
  description?: string,
  imageUrl?: string,
  options?: {
    bottleSizeMl?: number;
    costPrice?: number;
    servingSizeMl?: number;
    servingPrice?: number;
    billingType?: BillingType;
    portionOptions?: PortionOption[];
  }
): Promise<MenuItem> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!profile?.branch_id) throw new Error('User not assigned to a branch');

  return createMenuItemForBranch(profile.branch_id, {
    name,
    price,
    categoryId,
    description,
    imageUrl,
    ...options,
  });
}

// Create menu item for a specific branch (Admin use for multi-branch creation)
export async function createMenuItemForBranch(
  branchId: string,
  options: {
    name: string;
    price: number;
    categoryId?: string;
    description?: string;
    imageUrl?: string;
    bottleSizeMl?: number;
    costPrice?: number;
    servingSizeMl?: number;
    servingPrice?: number;
    billingType?: BillingType;
    portionOptions?: PortionOption[];
  }
): Promise<MenuItem> {
  const insertData = {
    branch_id: branchId,
    category_id: options.categoryId,
    name: options.name,
    price: options.price,
    description: options.description,
    image_url: options.imageUrl,
    bottle_size_ml: options.bottleSizeMl,
    cost_price: options.costPrice,
    serving_size_ml: options.servingSizeMl,
    serving_price: options.servingPrice,
    billing_type: options.billingType || 'bottle_only',
    portion_options: options.portionOptions || null,
  } as any;

  const { data, error } = await supabase
    .from('menu_items')
    .insert(insertData)
    .select(`
      *,
      category:categories(id, name)
    `)
    .single();

  if (error) throw error;
  return data as unknown as MenuItem;
}

// Update menu item with portion options support
export async function updateMenuItemWithPortions(
  menuItemId: string,
  updates: Partial<Pick<MenuItem, 'name' | 'price' | 'description' | 'image_url' | 'category_id' | 'is_available' | 'is_active' | 'billing_type' | 'bottle_size_ml' | 'cost_price' | 'serving_size_ml' | 'serving_price' | 'portion_options'>>
): Promise<MenuItem> {
  const updateData: Record<string, unknown> = { ...updates };
  
  // No special handling needed -- JSONB column handles serialization automatically
  
  const { data, error } = await supabase
    .from('menu_items')
    .update(updateData)
    .eq('id', menuItemId)
    .select(`
      *,
      category:categories(id, name)
    `)
    .single();

  if (error) throw error;
  return data as unknown as MenuItem;
}

// Update menu item
export async function updateMenuItem(
  menuItemId: string,
  updates: Partial<Pick<MenuItem, 'name' | 'price' | 'description' | 'image_url' | 'category_id' | 'is_available' | 'is_active'>>
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', menuItemId)
    .select(`
      *,
      category:categories(id, name)
    `)
    .single();

  if (error) throw error;
  return data as unknown as MenuItem;
}

// Toggle menu item availability
export async function toggleMenuItemAvailability(menuItemId: string): Promise<MenuItem> {
  const item = await getMenuItem(menuItemId);
  if (!item) throw new Error('Menu item not found');
  
  return updateMenuItem(menuItemId, { is_available: !item.is_available });
}

// Delete menu item (soft delete)
export async function deleteMenuItem(menuItemId: string): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_active: false })
    .eq('id', menuItemId);

  if (error) throw error;
}

// Search menu items
export async function searchMenuItems(query: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as MenuItem[];
}
