import { supabase } from "@/integrations/supabase/client";

// OMR denomination values
export const OMR_DENOMINATIONS = {
  bills: [
    { value: 50, label: "50 OMR" },
    { value: 20, label: "20 OMR" },
    { value: 10, label: "10 OMR" },
    { value: 5, label: "5 OMR" },
    { value: 1, label: "1 OMR" },
    { value: 0.5, label: "500 Baisa" },
  ],
  coins: [
    { value: 0.2, label: "200 Baisa" },
    { value: 0.1, label: "100 Baisa" },
    { value: 0.05, label: "50 Baisa" },
    { value: 0.025, label: "25 Baisa" },
    { value: 0.01, label: "10 Baisa" },
    { value: 0.005, label: "5 Baisa" },
  ],
};

export interface DenominationBreakdown {
  [key: string]: number; // denomination value as string key, count as value
}

export interface CashDrawerCount {
  id: string;
  session_id: string;
  user_id: string;
  branch_id: string;
  expected_cash: number;
  counted_cash: number;
  variance: number;
  denomination_breakdown: DenominationBreakdown | null;
  notes: string | null;
  counted_at: string;
  created_at: string;
}

export interface CashCountInput {
  sessionId: string;
  userId: string;
  branchId: string;
  expectedCash: number;
  countedCash: number;
  denominationBreakdown?: DenominationBreakdown;
  notes?: string;
}

// Calculate total from denomination breakdown
export function calculateTotalFromDenominations(breakdown: DenominationBreakdown): number {
  let total = 0;
  Object.entries(breakdown).forEach(([denomination, count]) => {
    total += parseFloat(denomination) * count;
  });
  return Math.round(total * 1000) / 1000; // Round to 3 decimal places for OMR
}

// Save cash drawer count
export async function saveCashDrawerCount(input: CashCountInput): Promise<CashDrawerCount | null> {
  const { data, error } = await supabase
    .from("cash_drawer_counts")
    .insert({
      session_id: input.sessionId,
      user_id: input.userId,
      branch_id: input.branchId,
      expected_cash: input.expectedCash,
      counted_cash: input.countedCash,
      denomination_breakdown: input.denominationBreakdown || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving cash drawer count:", error);
    return null;
  }

  return data as CashDrawerCount;
}

// Get cash drawer count for a session
export async function getCashDrawerCountBySession(sessionId: string): Promise<CashDrawerCount | null> {
  const { data, error } = await supabase
    .from("cash_drawer_counts")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No record found
    }
    console.error("Error fetching cash drawer count:", error);
    return null;
  }

  return data as CashDrawerCount;
}

// Get all cash drawer counts for a user
export async function getUserCashDrawerCounts(userId: string): Promise<CashDrawerCount[]> {
  const { data, error } = await supabase
    .from("cash_drawer_counts")
    .select("*")
    .eq("user_id", userId)
    .order("counted_at", { ascending: false });

  if (error) {
    console.error("Error fetching user cash drawer counts:", error);
    return [];
  }

  return data as CashDrawerCount[];
}

// Get all cash drawer counts for a branch (managers)
export async function getBranchCashDrawerCounts(branchId: string): Promise<CashDrawerCount[]> {
  const { data, error } = await supabase
    .from("cash_drawer_counts")
    .select("*")
    .eq("branch_id", branchId)
    .order("counted_at", { ascending: false });

  if (error) {
    console.error("Error fetching branch cash drawer counts:", error);
    return [];
  }

  return data as CashDrawerCount[];
}

// Variance threshold for manager approval (OMR)
export const VARIANCE_THRESHOLD = 0.5;

// Check if variance requires manager approval
export function requiresManagerApproval(variance: number): boolean {
  return Math.abs(variance) > VARIANCE_THRESHOLD;
}
