import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus } from 'lucide-react';
import { getTables, updateTableStatus } from '@/services/tableService';
import { useToast } from '@/hooks/use-toast';
import type { RestaurantTable, TableStatus } from '@/types/pos';

const STATUS_STYLES: Record<TableStatus, string> = {
  available: 'border-green-500 bg-green-500/10 text-green-700',
  occupied: 'border-red-500 bg-red-500/10 text-red-700',
  reserved: 'border-yellow-500 bg-yellow-500/10 text-yellow-700',
  cleaning: 'border-blue-500 bg-blue-500/10 text-blue-700',
};

export default function Tables() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    try {
      const data = await getTables();
      setTables(data);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  }

  async function handleStatusChange(table: RestaurantTable, newStatus: TableStatus) {
    setLoading(true);
    try {
      await updateTableStatus(table.id, newStatus);
      toast({ title: 'Status Updated', description: `${table.table_number} is now ${newStatus}` });
      loadTables();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <h1 className="font-bold text-lg">Tables</h1>
        <div className="ml-auto flex gap-2">
          <Badge variant="outline">{stats.available} Available</Badge>
          <Badge variant="secondary">{stats.occupied} Occupied</Badge>
        </div>
      </header>

      <main className="p-2 sm:p-4 md:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {tables.map(table => (
            <Card key={table.id} className={`border-2 rounded-xl ${STATUS_STYLES[table.status as TableStatus]}`}>
              <CardContent className="p-3 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <div className="text-lg font-bold">{table.table_number}</div>
                  <div className="shrink-0">
                    {table.status === 'available' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" asChild>
                        <Link to="/new-order">Order</Link>
                      </Button>
                    )}
                    {table.status === 'occupied' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleStatusChange(table, 'cleaning')} disabled={loading}>
                        Clear
                      </Button>
                    )}
                    {table.status === 'cleaning' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleStatusChange(table, 'available')} disabled={loading}>
                        Ready
                      </Button>
                    )}
                    {table.status === 'reserved' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleStatusChange(table, 'occupied')} disabled={loading}>
                        Seat
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{table.capacity} seats</div>
                <Badge className="capitalize text-[10px] w-fit mt-1">{table.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
