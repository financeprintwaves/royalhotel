import { supabase } from '@/integrations/supabase/client';
import type { 
  Payment, 
  PaymentMethod,
  FinalizePaymentResponse,
  SplitPaymentResponse,
  RefundResponse,
  SplitPaymentInput
} from '@/types/pos';
import { generateIdempotencyKey } from './orderService';

// Finalize payment via atomic RPC
export async function finalizePayment(
  orderId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  transactionReference?: string,
  notes?: string
): Promise<FinalizePaymentResponse> {
  const idempotencyKey = generateIdempotencyKey();

  const { data, error } = await supabase.rpc('finalize_payment', {
    p_order_id: orderId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_idempotency_key: idempotencyKey,
    p_transaction_reference: transactionReference || null,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data as unknown as FinalizePaymentResponse;
}

// Process split payment via atomic RPC
export async function processSplitPayment(
  orderId: string,
  payments: Omit<SplitPaymentInput, 'idempotency_key'>[]
): Promise<SplitPaymentResponse> {
  const paymentsWithKeys = payments.map(p => ({
    ...p,
    idempotency_key: generateIdempotencyKey(),
  }));

  const { data, error } = await supabase.rpc('process_split_payment', {
    p_order_id: orderId,
    p_payments: paymentsWithKeys as unknown as Record<string, unknown>[],
  });

  if (error) throw error;
  return data as unknown as SplitPaymentResponse;
}

// Process refund via atomic RPC (Manager/Admin only)
export async function processRefund(
  paymentId: string,
  amount: number,
  reason: string
): Promise<RefundResponse> {
  const { data, error } = await supabase.rpc('process_refund', {
    p_payment_id: paymentId,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) throw error;
  return data as unknown as RefundResponse;
}

// Get payments for an order
export async function getOrderPayments(orderId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Payment[];
}

// Get all payments for branch (for reporting)
export async function getBranchPayments(
  startDate?: string,
  endDate?: string
): Promise<Payment[]> {
  let query = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as Payment[];
}

// Get payment summary for reporting
export async function getPaymentSummary(
  startDate?: string,
  endDate?: string
): Promise<{
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  paymentsByMethod: Record<PaymentMethod, number>;
  transactionCount: number;
}> {
  const payments = await getBranchPayments(startDate, endDate);
  
  const paidPayments = payments.filter(p => p.payment_status === 'paid');
  const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  
  // Get refunds
  const { data: refunds } = await supabase
    .from('refunds')
    .select('amount');

  const totalRefunds = refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
  
  const paymentsByMethod: Record<PaymentMethod, number> = {
    cash: 0,
    card: 0,
    mobile: 0,
    split: 0,
  };

  paidPayments.forEach(p => {
    paymentsByMethod[p.payment_method] += Number(p.amount);
  });

  return {
    totalRevenue,
    totalRefunds,
    netRevenue: totalRevenue - totalRefunds,
    paymentsByMethod,
    transactionCount: paidPayments.length,
  };
}

// Quick cash payment helper
export async function payCash(orderId: string, amount: number): Promise<FinalizePaymentResponse> {
  return finalizePayment(orderId, amount, 'cash');
}

// Quick card payment helper
export async function payCard(
  orderId: string, 
  amount: number,
  transactionReference: string
): Promise<FinalizePaymentResponse> {
  return finalizePayment(orderId, amount, 'card', transactionReference);
}

// Quick mobile payment helper
export async function payMobile(
  orderId: string,
  amount: number,
  transactionReference: string
): Promise<FinalizePaymentResponse> {
  return finalizePayment(orderId, amount, 'mobile', transactionReference);
}
