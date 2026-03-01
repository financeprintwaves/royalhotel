import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, UtensilsCrossed, Receipt, Users, ChefHat, Sparkles, BarChart3, Calendar, UserCog, BookOpen, Package, MonitorPlay, RefreshCw, Building2, Printer } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getOrders } from '@/services/orderService';
import { getTables } from '@/services/tableService';
import { getInventoryAlertsCount } from '@/services/inventoryService';
import { useToast } from '@/hooks/use-toast';
import type { Order, RestaurantTable } from '@/types/pos';
import LogoutSummaryDialog from '@/components/LogoutSummaryDialog';

const DEMO_BRANCH_ID = 'a1111111-1111-1111-1111-111111111111';

// Mobile tile color map for quick actions
const MOBILE_TILE_COLORS: Record<string, string> = {
  'POS Terminal': 'mobile-gradient-green',
  'View Orders': 'mobile-gradient-blue',
  'Tables': 'mobile-gradient-orange',
  'Kitchen Display': 'mobile-gradient-rose',
  'Reports': 'mobile-gradient-purple',
  'Reservations': 'mobile-gradient-teal',
  'Menu Management': 'mobile-gradient-amber',
  'Inventory': 'mobile-gradient-indigo',
  'Staff Management': 'mobile-gradient-purple',
  'Branch Management': 'mobile-gradient-blue',
  'Printer Settings': 'mobile-gradient-orange',
};

export default function Dashboard() {
  const { user, profile, roles, initiateLogout, confirmLogout, showLogoutSummary, setShowLogoutSummary, sessionSummary } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [hasBranch, setHasBranch] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (profile?.branch_id) {
      setHasBranch(true);
      loadData();
    }
  }, [profile]);

  async function loadData() {
    try {
      const [ordersData, tablesData, alertsCount] = await Promise.all([
        getOrders(),
        getTables(),
        getInventoryAlertsCount(),
      ]);
      setOrders(ordersData);
      setTables(tablesData);
      setLowStockCount(alertsCount);
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

  const handleLogout = async () => {
    await initiateLogout();
  };

  const handleSwitchUser = async () => {
    await initiateLogout();
  };

  const handleConfirmLogout = async () => {
    if (!sessionSummary) return;
    setIsLoggingOut(true);
    try {
      await confirmLogout({
        cash: sessionSummary.cashTotal,
        card: sessionSummary.cardTotal,
        mobile: sessionSummary.mobileTotal,
      });
      navigate('/auth');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const activeOrders = orders.filter(o => !['PAID', 'CLOSED'].includes(o.order_status));
  const pendingBills = orders.filter(o => o.order_status === 'BILL_REQUESTED');
  const occupiedTables = tables.filter(t => t.status === 'occupied');
  const todayRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Quick action items for rendering
  const quickActions = [
    { to: '/pos', icon: MonitorPlay, label: 'POS Terminal', always: true },
    { to: '/orders', icon: Receipt, label: 'View Orders', always: true },
    { to: '/tables', icon: Users, label: 'Tables', always: true },
    { to: '/kitchen', icon: ChefHat, label: 'Kitchen Display', always: true },
    { to: '/reports', icon: BarChart3, label: 'Reports', always: true },
    { to: '/reservations', icon: Calendar, label: 'Reservations', always: true },
    { to: '/menu', icon: BookOpen, label: 'Menu Management', role: 'manager' as const },
    { to: '/inventory', icon: Package, label: 'Inventory', role: 'manager' as const, badge: lowStockCount },
    { to: '/staff', icon: UserCog, label: 'Staff Management', role: 'admin' as const },
    { to: '/branches', icon: Building2, label: 'Branch Management', role: 'manager' as const },
    { to: '/settings/printer', icon: Printer, label: 'Printer Settings', role: 'manager' as const },
  ].filter(item => {
    if (item.always) return true;
    if (item.role === 'admin') return roles.includes('admin');
    if (item.role === 'manager') return roles.includes('admin') || roles.includes('manager');
    return false;
  });

  // Stat cards data
  const statCards = [
    { label: 'Active Orders', value: activeOrders.length, gradient: 'mobile-gradient-purple' },
    { label: 'Tables Occupied', value: `${occupiedTables.length} / ${tables.length}`, gradient: 'mobile-gradient-blue' },
    { label: "Today's Revenue", value: `${todayRevenue.toFixed(3)} OMR`, gradient: 'mobile-gradient-green' },
    { label: 'Pending Bills', value: pendingBills.length, gradient: 'mobile-gradient-orange' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header - colorful gradient on mobile */}
      <header className="border-b bg-card md:bg-card px-4 sm:px-6 py-4 max-md:mobile-gradient-header max-md:border-0 max-md:sticky max-md:top-0 max-md:z-30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-8 w-8 text-primary max-md:text-white" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold max-md:text-white">Restaurant POS</h1>
              <p className="text-sm text-muted-foreground max-md:text-white/80">Welcome, {profile?.full_name || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex gap-1 sm:gap-2">
              {roles.map(role => (<Badge key={role} variant="secondary" className="capitalize text-xs max-md:bg-white/20 max-md:text-white max-md:border-0">{role}</Badge>))}
            </div>
            <Button variant="outline" size="sm" onClick={handleSwitchUser} className="max-md:bg-white/20 max-md:text-white max-md:border-white/30 max-md:hover:bg-white/30">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Switch User</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="max-md:bg-white/20 max-md:text-white max-md:border-white/30 max-md:hover:bg-white/30">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6">
        {!hasBranch && roles.includes('admin') ? (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />Get Started with Demo Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Click below to become the admin of "Downtown Bistro" with sample menu items and tables ready for testing.</p>
              <Button onClick={handleBootstrap} disabled={bootstrapping} className="w-full">{bootstrapping ? 'Setting up...' : 'Claim Admin Role & Demo Branch'}</Button>
            </CardContent>
          </Card>
        ) : !hasBranch ? (
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />No Branch Assigned
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">You haven't been assigned to a branch yet. Please contact your manager or administrator to get access to the POS system.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Quick Actions - large colorful tiles on mobile, normal buttons on desktop */}
            <Card className="max-md:border-0 max-md:shadow-none max-md:bg-transparent">
              <CardHeader className="max-md:px-0">
                <CardTitle className="max-md:text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="max-md:px-0">
                {/* Desktop: horizontal button row */}
                <div className="hidden md:flex flex-wrap gap-4">
                  {quickActions.map(item => (
                    <Button key={item.to} size="lg" variant={item.to === '/pos' ? 'default' : 'outline'} className="gap-2 relative" asChild>
                      <Link to={item.to}>
                        <item.icon className="h-5 w-5" />{item.label}
                        {item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">{item.badge}</Badge>
                        )}
                      </Link>
                    </Button>
                  ))}
                </div>
                {/* Mobile: colorful grid tiles */}
                <div className="grid grid-cols-2 gap-3 md:hidden">
                  {quickActions.map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl p-5 text-white mobile-card-shadow transition-transform active:scale-95 ${MOBILE_TILE_COLORS[item.label] || 'mobile-gradient-purple'}`}
                    >
                      <item.icon className="h-8 w-8" />
                      <span className="text-sm font-semibold text-center leading-tight">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <Badge variant="destructive" className="absolute top-2 right-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs animate-badge-pulse">{item.badge}</Badge>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats - gradient cards on mobile, plain on desktop */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {statCards.map(stat => (
                <Card key={stat.label} className={`${isMobile ? `${stat.gradient} text-white border-0 rounded-2xl mobile-card-shadow` : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm font-medium ${isMobile ? 'text-white/80' : 'text-muted-foreground'}`}>{stat.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <LogoutSummaryDialog open={showLogoutSummary} onOpenChange={setShowLogoutSummary} summary={sessionSummary} onConfirmLogout={handleConfirmLogout} isLoading={isLoggingOut} />
    </div>
  );
}
