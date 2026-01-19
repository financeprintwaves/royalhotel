import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Calendar, Clock, Users, Phone, Mail, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTables } from '@/services/tableService';
import { 
  getReservations, 
  createReservation, 
  updateReservationStatus, 
  cancelReservation,
  seatReservation,
  completeReservation,
  type ReservationWithTable 
} from '@/services/reservationService';
import type { RestaurantTable } from '@/types/pos';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  seated: 'bg-green-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500',
  no_show: 'bg-orange-500',
};

export default function Reservations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<ReservationWithTable[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // New reservation form
  const [formData, setFormData] = useState({
    table_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    reservation_date: new Date().toISOString().split('T')[0],
    start_time: '12:00',
    end_time: '14:00',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    try {
      const [reservationsData, tablesData] = await Promise.all([
        getReservations(selectedDate),
        getTables(),
      ]);
      setReservations(reservationsData);
      setTables(tablesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async function handleCreateReservation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createReservation({
        ...formData,
        start_time: formData.start_time + ':00',
        end_time: formData.end_time + ':00',
      });
      toast({ title: 'Success', description: 'Reservation created successfully' });
      setDialogOpen(false);
      setFormData({
        table_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        party_size: 2,
        reservation_date: selectedDate,
        start_time: '12:00',
        end_time: '14:00',
        notes: '',
      });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, action: 'seat' | 'complete' | 'cancel' | 'no_show') {
    setLoading(true);
    try {
      switch (action) {
        case 'seat':
          await seatReservation(id);
          break;
        case 'complete':
          await completeReservation(id);
          break;
        case 'cancel':
          await cancelReservation(id);
          break;
        case 'no_show':
          await updateReservationStatus(id, 'no_show');
          break;
      }
      toast({ title: 'Status Updated' });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    seated: reservations.filter(r => r.status === 'seated').length,
    pending: reservations.filter(r => r.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <h1 className="font-bold text-lg">Reservations</h1>
        <div className="ml-auto flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Badge variant="outline">{stats.confirmed} Confirmed</Badge>
          <Badge variant="secondary">{stats.seated} Seated</Badge>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Reservation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateReservation} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer Name *</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Party Size *</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={formData.party_size}
                      onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Table *</Label>
                  <Select 
                    value={formData.table_id} 
                    onValueChange={(value) => setFormData({ ...formData, table_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.table_number} ({table.capacity} seats)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.reservation_date}
                    onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time *</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Special requests..."
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Reservation'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-6">
        {reservations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reservations for this date</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reservations.map((reservation) => (
              <Card key={reservation.id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${STATUS_COLORS[reservation.status]}`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{reservation.customer_name}</CardTitle>
                    <Badge variant="outline" className="capitalize">{reservation.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {reservation.start_time.slice(0, 5)} - {reservation.end_time.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {reservation.party_size}
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">Table:</span> {reservation.table_number || 'Unknown'}
                  </div>

                  {reservation.customer_phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {reservation.customer_phone}
                    </div>
                  )}

                  {reservation.customer_email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {reservation.customer_email}
                    </div>
                  )}

                  {reservation.notes && (
                    <p className="text-sm text-muted-foreground italic">"{reservation.notes}"</p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {reservation.status === 'confirmed' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusChange(reservation.id, 'seat')}
                          disabled={loading}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />Seat
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleStatusChange(reservation.id, 'no_show')}
                          disabled={loading}
                        >
                          No Show
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleStatusChange(reservation.id, 'cancel')}
                          disabled={loading}
                        >
                          <XCircle className="h-4 w-4 mr-1" />Cancel
                        </Button>
                      </>
                    )}
                    {reservation.status === 'seated' && (
                      <Button 
                        size="sm"
                        onClick={() => handleStatusChange(reservation.id, 'complete')}
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />Complete
                      </Button>
                    )}
                    {reservation.status === 'pending' && (
                      <>
                        <Button 
                          size="sm"
                          onClick={() => handleStatusChange(reservation.id, 'seat')}
                          disabled={loading}
                        >
                          Confirm & Seat
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleStatusChange(reservation.id, 'cancel')}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
