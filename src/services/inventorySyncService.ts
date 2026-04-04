import { supabase } from '@/integrations/supabase/client';
import type { InventoryTransferRequest } from '@/types/pos';

export async function requestInventoryTransfer(params: {
  from_branch_id: string;
  to_branch_id: string;
  inventory_id: string;
  quantity: number;
  requested_by: string;
  notes?: string;
}): Promise<InventoryTransferRequest> {
  const { data, error } = await (supabase as any)
    .from('inventory_transfer_requests')
    .insert({
      from_branch_id: params.from_branch_id,
      to_branch_id: params.to_branch_id,
      inventory_id: params.inventory_id,
      quantity: params.quantity,
      requested_by: params.requested_by,
      notes: params.notes,
      status: 'requested',
    })
    .single();

  if (error) throw error;
  return data as InventoryTransferRequest;
}

export async function getTransferRequests(branchId?: string): Promise<InventoryTransferRequest[]> {
  let query = supabase
    .from('inventory_transfer_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (branchId) {
    query = query.or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as InventoryTransferRequest[];
}

export async function updateTransferRequestStatus(params: {
  requestId: string;
  status: 'approved' | 'rejected' | 'completed';
  approved_by?: string;
  notes?: string;
}): Promise<InventoryTransferRequest> {
  const { data, error } = await supabase
    .from('inventory_transfer_requests')
    .update({
      status: params.status,
      approved_by: params.approved_by || null,
      decided_at: new Date().toISOString(),
      notes: params.notes || null,
    })
    .eq('id', params.requestId)
    .single();

  if (error) throw error;
  return data as InventoryTransferRequest;
}
