import { supabase } from "@/integrations/supabase/client";

export interface StaffSession {
  id: string;
  user_id: string;
  branch_id: string | null;
  login_time: string;
  logout_time: string | null;
  cash_total: number;
  card_total: number;
  mobile_total: number;
  created_at: string;
}

export interface SessionSummary {
  sessionId: string;
  userName: string;
  loginTime: Date;
  logoutTime: Date;
  cashTotal: number;
  cardTotal: number;
  mobileTotal: number;
  totalAmount: number;
}

export interface PaymentTotals {
  cash: number;
  card: number;
  mobile: number;
}

// Start a new session for a user
export async function startSession(userId: string, branchId: string | null): Promise<StaffSession | null> {
  const { data, error } = await supabase
    .from('staff_sessions')
    .insert({
      user_id: userId,
      branch_id: branchId,
      login_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting session:', error);
    return null;
  }

  return data as StaffSession;
}

// Get the active session for a user
export async function getActiveSession(userId: string): Promise<StaffSession | null> {
  const { data, error } = await supabase
    .from('staff_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('logout_time', null)
    .order('login_time', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No active session found
      return null;
    }
    console.error('Error fetching active session:', error);
    return null;
  }

  return data as StaffSession;
}

// Calculate payment totals for a session
export async function getSessionPayments(
  userId: string,
  loginTime: string
): Promise<PaymentTotals> {
  const { data, error } = await supabase
    .from('payments')
    .select('amount, payment_method')
    .eq('processed_by', userId)
    .eq('payment_status', 'paid')
    .gte('created_at', loginTime);

  if (error) {
    console.error('Error fetching session payments:', error);
    return { cash: 0, card: 0, mobile: 0 };
  }

  const totals: PaymentTotals = { cash: 0, card: 0, mobile: 0 };

  data?.forEach((payment) => {
    const amount = Number(payment.amount) || 0;
    switch (payment.payment_method) {
      case 'cash':
        totals.cash += amount;
        break;
      case 'card':
        totals.card += amount;
        break;
      case 'mobile':
        totals.mobile += amount;
        break;
    }
  });

  return totals;
}

// End a session and save the payment totals
export async function endSession(
  sessionId: string,
  paymentTotals: PaymentTotals
): Promise<boolean> {
  const { error } = await supabase
    .from('staff_sessions')
    .update({
      logout_time: new Date().toISOString(),
      cash_total: paymentTotals.cash,
      card_total: paymentTotals.card,
      mobile_total: paymentTotals.mobile,
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error ending session:', error);
    return false;
  }

  return true;
}

// Get session summary for logout popup
export async function getSessionSummary(
  userId: string,
  userName: string
): Promise<SessionSummary | null> {
  const session = await getActiveSession(userId);
  
  if (!session) {
    return null;
  }

  const paymentTotals = await getSessionPayments(userId, session.login_time);
  const totalAmount = paymentTotals.cash + paymentTotals.card + paymentTotals.mobile;

  return {
    sessionId: session.id,
    userName,
    loginTime: new Date(session.login_time),
    logoutTime: new Date(),
    cashTotal: paymentTotals.cash,
    cardTotal: paymentTotals.card,
    mobileTotal: paymentTotals.mobile,
    totalAmount,
  };
}
