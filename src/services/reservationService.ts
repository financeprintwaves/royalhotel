import { supabase } from '@/integrations/supabase/client';

export interface Reservation {
  id: string;
  branch_id: string;
  table_id: string;
  customer_name: string;
  phone_number?: string;
  email?: string;
  party_size: number;
  reservation_time: string;
  reservation_status: 'confirmed' | 'checked_in' | 'no_show' | 'cancelled' | 'completed';
  special_requests?: string;
  seating_preference?: string;
  deposit_amount?: number;
  deposit_paid_at?: string;
  notes?: string;
  created_by_staff_id?: string;
  checked_in_at?: string;
  checked_in_by_staff_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Phase 2 Enhanced Reservation Service
 * Provides complete reservation management functionality
 */
export class ReservationServiceEnhanced {
  /**
   * Create a new reservation
   */
  static async createReservation(
    branchId: string,
    tableId: string,
    customerName: string,
    phoneNumber: string,
    partySize: number,
    reservationTime: Date,
    email?: string,
    specialRequests?: string,
    seatingPreference?: string,
    staffId?: string
  ): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        branch_id: branchId,
        table_id: tableId,
        customer_name: customerName,
        phone_number: phoneNumber,
        party_size: partySize,
        reservation_time: reservationTime.toISOString(),
        email,
        special_requests: specialRequests,
        seating_preference: seatingPreference,
        created_by_staff_id: staffId,
        reservation_status: 'confirmed'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get reservations for a specific date and branch
   */
  static async getReservationsForDate(
    branchId: string,
    date: Date
  ): Promise<Reservation[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('branch_id', branchId)
      .gte('reservation_time', startOfDay.toISOString())
      .lte('reservation_time', endOfDay.toISOString())
      .order('reservation_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get upcoming reservations
   */
  static async getUpcomingReservations(
    branchId: string,
    daysAhead: number = 7
  ): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('branch_id', branchId)
      .eq('reservation_status', 'confirmed')
      .gte('reservation_time', new Date().toISOString())
      .lte('reservation_time', new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString())
      .order('reservation_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Check in a reservation
   */
  static async checkInReservation(
    reservationId: string,
    staffId: string
  ): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .update({
        reservation_status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        checked_in_by_staff_id: staffId
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Cancel a reservation
   */
  static async cancelReservation(
    reservationId: string,
    reason?: string
  ): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .update({
        reservation_status: 'cancelled',
        notes: reason
      })
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark reservation as no-show
   */
  static async markAsNoShow(reservationId: string): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .update({ reservation_status: 'no_show' })
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get reservation by phone number
   */
  static async findReservationByPhone(
    branchId: string,
    phoneNumber: string
  ): Promise<Reservation | null> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('branch_id', branchId)
      .eq('phone_number', phoneNumber)
      .eq('reservation_status', 'confirmed')
      .gt('reservation_time', new Date().toISOString())
      .order('reservation_time', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  /**
   * Get reservation statistics
   */
  static async getReservationStats(branchId: string) {
    // Total reservations this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: totalReservations } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .gte('created_at', startOfMonth.toISOString())
      .eq('reservation_status', 'completed');

    // Upcoming confirmations
    const { count: upcomingConfirmations } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('reservation_status', 'confirmed')
      .gte('reservation_time', new Date().toISOString());

    // No-shows this month
    const { count: noShows } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('reservation_status', 'no_show')
      .gte('created_at', startOfMonth.toISOString());

    return {
      totalReservations: totalReservations || 0,
      upcomingConfirmations: upcomingConfirmations || 0,
      noShows: noShows || 0,
      noShowRate: totalReservations ? ((noShows || 0) / totalReservations * 100).toFixed(1) : '0'
    };
  }

  /**
   * Update reservation details
   */
  static async updateReservation(
    reservationId: string,
    updates: {
      partySize?: number;
      specialRequests?: string;
      seatingPreference?: string;
      email?: string;
    }
  ): Promise<Reservation> {
    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', reservationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Legacy exports for backward compatibility
export interface ReservationWithTable extends Reservation {
  table_number?: string;
  // DB column aliases used by Reservations.tsx
  status?: string;
  start_time?: string;
  end_time?: string;
  customer_phone?: string;
  customer_email?: string;
}

export async function getReservations(date?: string): Promise<ReservationWithTable[]> {
  let query = supabase
    .from('reservations')
    .select(`
      *,
      restaurant_tables (table_number)
    `)
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (date) {
    query = query.eq('reservation_date', date);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).map((r: any) => ({
    ...r,
    table_number: r.restaurant_tables?.table_number,
  }));
}

export async function getUpcomingReservations(): Promise<ReservationWithTable[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      restaurant_tables (table_number)
    `)
    .gte('reservation_date', today)
    .in('status', ['pending', 'confirmed'])
    .order('reservation_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;
  
  return (data || []).map((r: any) => ({
    ...r,
    table_number: r.restaurant_tables?.table_number,
  }));
}

export async function createReservation(reservation: {
  table_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  party_size: number;
  reservation_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
}): Promise<Reservation> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!profile?.branch_id) throw new Error('User not assigned to a branch');

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      ...reservation,
      branch_id: profile.branch_id,
      created_by: userData.user.id,
      status: 'confirmed',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Reservation;
}

export async function updateReservation(
  id: string,
  updates: Partial<Pick<Reservation, 'customer_name' | 'customer_phone' | 'customer_email' | 'party_size' | 'reservation_date' | 'start_time' | 'end_time' | 'status' | 'notes' | 'table_id'>>
): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Reservation;
}

export async function updateReservationStatus(
  id: string,
  status: Reservation['status']
): Promise<Reservation> {
  return updateReservation(id, { status });
}

export async function cancelReservation(id: string): Promise<Reservation> {
  return updateReservationStatus(id, 'cancelled');
}

export async function seatReservation(id: string): Promise<Reservation> {
  return updateReservationStatus(id, 'seated');
}

export async function completeReservation(id: string): Promise<Reservation> {
  return updateReservationStatus(id, 'completed');
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Check if a table is available for a given time slot
export async function checkTableAvailability(
  tableId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: string
): Promise<boolean> {
  let query = supabase
    .from('reservations')
    .select('id')
    .eq('table_id', tableId)
    .eq('reservation_date', date)
    .in('status', ['pending', 'confirmed', 'seated'])
    .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

  if (excludeReservationId) {
    query = query.neq('id', excludeReservationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).length === 0;
}

// Get available time slots for a table on a given date
export async function getAvailableTimeSlots(
  tableId: string,
  date: string
): Promise<{ start: string; end: string }[]> {
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('start_time, end_time')
    .eq('table_id', tableId)
    .eq('reservation_date', date)
    .in('status', ['pending', 'confirmed', 'seated'])
    .order('start_time', { ascending: true });

  if (error) throw error;

  // Generate time slots from 10:00 to 22:00 (adjust as needed)
  const allSlots: { start: string; end: string }[] = [];
  for (let hour = 10; hour < 22; hour += 2) {
    allSlots.push({
      start: `${hour.toString().padStart(2, '0')}:00:00`,
      end: `${(hour + 2).toString().padStart(2, '0')}:00:00`,
    });
  }

  // Filter out reserved slots
  return allSlots.filter(slot => {
    return !reservations?.some(r => {
      const rStart = r.start_time;
      const rEnd = r.end_time;
      return rStart < slot.end && rEnd > slot.start;
    });
  });
}
