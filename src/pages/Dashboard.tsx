import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Plus, UtensilsCrossed, Receipt, Users, ChefHat, Sparkles, BarChart3, Calendar, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getOrders } from '@/services/orderService';
import { getTables } from '@/services/tableService';
import { useToast } from '@/hooks/use-toast';
import type { Order, RestaurantTable } from '@/types/pos';

const DEMO_BRANCH_ID = 'a1111111-1111-1111-1111-111111111111';

export default function Dashboard() {
  const { user, profile, roles, signOut } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [hasBranch, setHasBranch] = useState(false);

  useEffect(() => {
    if (profile?.branch_id) {
      setHasBranch(true);
      loadData();
    }
  }, [profile]);

  async function loadData() {
    try {
      const [ordersData, tablesData] = await Promise.all([getOrders(), getTables()]);
      setOrders(ordersData);
      setTables(tablesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async function handleBootstrap() {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.rpc('bootstrap_demo_admin', { p_branch_id: DEMO_BRANCH_ID });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; message?: string };
      if (!result.success) throw new Error(result.error || 'Bootstrap failed');
      toast({ title: 'Success!', description: 'You are now the admin of Downtown Bistro!' });
      window.location.reload();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Bootstrap Failed', description: error.message });
    } finally {
      setBootstrapping(false);
    }
  }

  const activeOrders = orders.filter(o => !['PAID', 'CLOSED'].includes(o.order_status));
  const pendingBills = orders.filter(o => o.order_status === 'BILL_REQUESTED');
  const occupiedTables = tables.filter(t => t.status === 'occupied');
  const todayRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Restaurant POS</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {profile?.full_name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {roles.map(role => (
                <Badge key={role} variant="secondary" className="capitalize">{role}</Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {!hasBranch ? (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Get Started with Demo Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Click below to become the admin of "Downtown Bistro" with sample menu items and tables ready for testing.
              </p>
              <Button onClick={handleBootstrap} disabled={bootstrapping} className="w-full">
                {bootstrapping ? 'Setting up...' : 'Claim Admin Role & Demo Branch'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Quick Actions */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/new-order">
                    <Plus className="h-5 w-5" />New Order
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to="/orders">
                    <Receipt className="h-5 w-5" />View Orders
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to="/tables">
                    <Users className="h-5 w-5" />Tables
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to="/kitchen">
                    <ChefHat className="h-5 w-5" />Kitchen Display
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to="/reports">
                    <BarChart3 className="h-5 w-5" />Reports
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to="/reservations">
                    <Calendar className="h-5 w-5" />Reservations
                  </Link>
                </Button>
                {roles.includes('admin') && (
                  <Button size="lg" variant="outline" className="gap-2" asChild>
                    <Link to="/staff">
                      <UserCog className="h-5 w-5" />Staff Management
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activeOrders.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tables Occupied</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{occupiedTables.length} / {tables.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${todayRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{pendingBills.length}</div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
