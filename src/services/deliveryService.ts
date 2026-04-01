import { supabase } from '@/integrations/supabase/client';
import type { DeliveryAssignment, DeliveryDriver, DeliveryStatus } from '@/types/pos';

export async function listDeliveryDrivers(): Promise<DeliveryDriver[]> {
  const { data, error } = await supabase
    .from('delivery_drivers')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return (data || []) as DeliveryDriver[];
}

export async function createDeliveryDriver(driver: {
  full_name: string;
  phone_number: string;
  vehicle_plate?: string;
  branch_id: string;
}): Promise<DeliveryDriver> {
  const { data, error } = await supabase
    .from('delivery_drivers')
    .insert({ ...driver, status: 'available' })
    .single();

  if (error) throw error;
  return data as DeliveryDriver;
}

export async function listDeliveryAssignments(branchId?: string): Promise<DeliveryAssignment[]> {
  let query = supabase
    .from('delivery_assignments')
    .select('*, driver:delivery_drivers(*), order:orders(*)')
    .order('created_at', { ascending: false });

  if (branchId) query = query.eq('branch_id', branchId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DeliveryAssignment[];
}

export async function assignDeliveryOrder(params: {
  order_id: string;
  driver_id: string;
  branch_id: string;
  assigned_by: string;
  eta_minutes: number;
  route_geojson?: string | null;
}): Promise<DeliveryAssignment> {
  const { data, error } = await supabase.from('delivery_assignments').insert({
    order_id: params.order_id,
    driver_id: params.driver_id,
    branch_id: params.branch_id,
    assigned_by: params.assigned_by,
    eta_minutes: params.eta_minutes,
    status: 'awaiting_pickup',
    route_geojson: params.route_geojson || null,
  }).single();

  if (error) throw error;

  await supabase
    .from('delivery_drivers')
    .update({ status: 'assigned' })
    .eq('id', params.driver_id);

  await supabase
    .from('orders')
    .update({ order_status: 'SENT_TO_KITCHEN' })
    .eq('id', params.order_id);

  return data as DeliveryAssignment;
}

export async function updateDeliveryStatus(assignmentId: string, status: DeliveryStatus): Promise<DeliveryAssignment> {
  const { data, error } = await supabase
    .from('delivery_assignments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .single();

  if (error) throw error;

  if (status === 'delivered' || status === 'cancelled' || status === 'failed') {
    const assignment = data as DeliveryAssignment;
    await supabase
      .from('delivery_drivers')
      .update({ status: 'available' })
      .eq('id', assignment.driver_id);

    if (status === 'delivered') {
      await supabase
        .from('orders')
        .update({ order_status: 'PAID', payment_status: 'paid' })
        .eq('id', assignment.order_id);
    }
  }

  return data as DeliveryAssignment;
}
