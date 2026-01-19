import { supabase } from '@/integrations/supabase/client';

export interface Reservation {
  id: string;
  branch_id: string;
  table_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  party_size: number;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithTable extends Reservation {
  table_number?: string;
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
