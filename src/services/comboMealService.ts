import { supabase } from '@/integrations/supabase/client';

export interface ComboMeal {
  id: string;
  branch_id: string;
  name: string;
  description?: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComboMealItem {
  id: string;
  combo_meal_id: string;
  menu_item_id: string;
  quantity: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderComboItem {
  id: string;
  order_id: string;
  combo_meal_id: string;
  selected_items: any;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export class ComboMealService {
  static async getActiveCombos(branchId: string): Promise<ComboMeal[]> {
    const { data, error } = await supabase
      .from('combo_meals')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getComboItems(comboId: string): Promise<ComboMealItem[]> {
    const { data, error } = await supabase
      .from('combo_meal_items')
      .select('*')
      .eq('combo_meal_id', comboId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async addComboToOrder(orderId: string, comboId: string, selectedItems: any, quantity = 1): Promise<OrderComboItem> {
    const { data, error } = await supabase
      .from('order_combo_items')
      .insert({
        order_id: orderId,
        combo_meal_id: comboId,
        selected_items: selectedItems,
        quantity
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getOrderComboDetails(orderId: string): Promise<OrderComboItem[]> {
    const { data, error } = await supabase
      .from('order_combo_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) throw error;
    return data || [];
  }

  static async createComboMeal(combo: Partial<ComboMeal>): Promise<ComboMeal> {
    const { data, error } = await supabase
      .from('combo_meals')
      .insert(combo)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createComboMealItem(item: Partial<ComboMealItem>): Promise<ComboMealItem> {
    const { data, error } = await supabase
      .from('combo_meal_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export default ComboMealService;
