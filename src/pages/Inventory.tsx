import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { 
  ArrowLeft, Package, AlertTriangle, Plus, Minus, Settings, RefreshCw, 
  History, ArrowUpCircle, ArrowDownCircle, RotateCcw, Pencil
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  getInventory,
  getLowStockItems,
  updateInventoryQuantity,
  addStock,
  setLowStockThreshold,
  getInventoryHistory,
  getBranchInventoryHistory,
  type InventoryHistoryEntry,
} from '@/services/inventoryService';
import type { Inventory } from '@/types/pos';
import { format } from 'date-fns';
import BranchSelector from '@/components/BranchSelector';

const CHANGE_TYPE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  add: { icon: ArrowUpCircle, label: 'Stock Added', color: 'text-green-500' },
  set: { icon: Pencil, label: 'Quantity Set', color: 'text-blue-500' },
  deduct: { icon: ArrowDownCircle, label: 'Deducted (Sale)', color: 'text-red-500' },
  refund: { icon: RotateCcw, label: 'Refund Restored', color: 'text-amber-500' },
  threshold: { icon: Settings, label: 'Threshold Changed', color: 'text-purple-500' },
  initial: { icon: Package, label: 'Initial Stock', color: 'text-gray-500' },
};

export default function InventoryPage() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<InventoryHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryHistoryEntry[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState('');

  // Dialog state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustMode, setAdjustMode] = useState<'add' | 'set' | 'threshold'>('add');

  const isManager = roles.includes('admin') || roles.includes('manager');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && historyItems.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  async function loadData() {
    try {
      const [inventoryData, lowStockData] = await Promise.all([
        getInventory(),
        getLowStockItems(),
      ]);
      setInventory(inventoryData);
      setLowStockItems(lowStockData);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const history = await getBranchInventoryHistory(100);
      setHistoryItems(history);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    if (activeTab === 'history') {
      await loadHistory();
    }
    setRefreshing(false);
    toast({ title: 'Refreshed', description: 'Inventory data updated' });
  }

  function openAdjustDialog(item: Inventory, mode: 'add' | 'set' | 'threshold') {
    setSelectedItem(item);
    setAdjustMode(mode);
    setAdjustQuantity(mode === 'threshold' ? (item.low_stock_threshold || 10).toString() : '');
    setAdjustReason('');
    setAdjustDialogOpen(true);
  }

  async function openItemHistory(item: Inventory) {
    setSelectedItemName(item.menu_item?.name || 'Unknown Item');
    setHistoryDialogOpen(true);
    try {
      const history = await getInventoryHistory(item.id, 50);
      setSelectedItemHistory(history);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  async function handleAdjust() {
    if (!selectedItem || !adjustQuantity) return;

    const qty = parseInt(adjustQuantity);
    if (isNaN(qty) || qty < 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Invalid quantity' });
      return;
    }

    try {
      if (adjustMode === 'add') {
        await addStock(selectedItem.id, qty, adjustReason || undefined);
        toast({ title: 'Success', description: `Added ${qty} units to ${selectedItem.menu_item?.name}` });
      } else if (adjustMode === 'set') {
        await updateInventoryQuantity(selectedItem.id, qty, adjustReason || undefined);
        toast({ title: 'Success', description: `Set ${selectedItem.menu_item?.name} stock to ${qty}` });
      } else {
        await setLowStockThreshold(selectedItem.id, qty);
        toast({ title: 'Success', description: `Low stock threshold updated` });
      }
      setAdjustDialogOpen(false);
      loadData();
      if (activeTab === 'history') {
        loadHistory();
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  }

  function getStockLevel(item: Inventory): 'critical' | 'low' | 'normal' | 'high' {
    const threshold = item.low_stock_threshold || 10;
    if (item.quantity === 0) return 'critical';
    if (item.quantity <= threshold) return 'low';
    if (item.quantity <= threshold * 2) return 'normal';
    return 'high';
  }

  function getStockBadge(level: 'critical' | 'low' | 'normal' | 'high') {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'low':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Low Stock</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'high':
        return <Badge className="bg-green-500 hover:bg-green-600">Well Stocked</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Inventory</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <BranchSelector 
              selectedBranchId={selectedBranchId} 
              onBranchChange={setSelectedBranchId}
            />
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Low Stock Alert</AlertTitle>
            <AlertDescription>
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} need restocking:{' '}
              {lowStockItems.map((item, i) => (
                <span key={item.id}>
                  <strong>{item.menu_item?.name}</strong> ({item.quantity} left)
                  {i < lowStockItems.length - 1 ? ', ' : ''}
                </span>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="stock">Current Stock</TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{inventory.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-500">
                    {lowStockItems.filter(i => i.quantity > 0).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    {inventory.filter(i => i.quantity === 0).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Well Stocked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {inventory.filter(i => getStockLevel(i) === 'high').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory Table */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-center">Threshold</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Stock Level</TableHead>
                      {isManager && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => {
                      const level = getStockLevel(item);
                      const threshold = item.low_stock_threshold || 10;
                      const percentage = Math.min((item.quantity / (threshold * 3)) * 100, 100);
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {item.menu_item?.image_url ? (
                                <img
                                  src={item.menu_item.image_url}
                                  alt={item.menu_item.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{item.menu_item?.name || 'Unknown Item'}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.menu_item?.price?.toFixed(2)} OMR
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-lg">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {threshold}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStockBadge(level)}
                          </TableCell>
                          <TableCell className="w-[200px]">
                            <Progress 
                              value={percentage} 
                              className={`h-2 ${
                                level === 'critical' ? '[&>div]:bg-destructive' :
                                level === 'low' ? '[&>div]:bg-amber-500' :
                                level === 'high' ? '[&>div]:bg-green-500' : ''
                              }`}
                            />
                          </TableCell>
                          {isManager && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openItemHistory(item)}
                                  title="View History"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAdjustDialog(item, 'add')}
                                >
                                  <Plus className="h-4 w-4 mr-1" />Add
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openAdjustDialog(item, 'set')}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openAdjustDialog(item, 'threshold')}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {inventory.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      No inventory items. Add menu items with inventory tracking to get started.
                    </p>
                    <Button className="mt-4" asChild>
                      <Link to="/menu">Go to Menu Management</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Inventory Change History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading history...</div>
                ) : historyItems.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {historyItems.map((entry) => {
                        const config = CHANGE_TYPE_CONFIG[entry.change_type] || CHANGE_TYPE_CONFIG.set;
                        const Icon = config.icon;
                        
                        return (
                          <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <div className={`mt-1 ${config.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{entry.menu_item_name}</span>
                                <Badge variant="outline" className="text-xs">{config.label}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {entry.change_type === 'threshold' ? (
                                  <span>Threshold: {entry.quantity_before} → {entry.quantity_after}</span>
                                ) : (
                                  <span>
                                    Quantity: {entry.quantity_before} → {entry.quantity_after}
                                    <span className={`ml-2 font-medium ${entry.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ({entry.quantity_change >= 0 ? '+' : ''}{entry.quantity_change})
                                    </span>
                                  </span>
                                )}
                              </div>
                              {entry.reason && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  "{entry.reason}"
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground text-right shrink-0">
                              {format(new Date(entry.created_at), 'MMM dd, yyyy')}
                              <br />
                              {format(new Date(entry.created_at), 'HH:mm')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No inventory history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustMode === 'add' && 'Add Stock'}
              {adjustMode === 'set' && 'Set Stock Level'}
              {adjustMode === 'threshold' && 'Set Low Stock Threshold'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {selectedItem?.menu_item?.image_url ? (
                <img
                  src={selectedItem.menu_item.image_url}
                  alt={selectedItem.menu_item.name}
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-background flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="font-medium">{selectedItem?.menu_item?.name}</div>
                <div className="text-sm text-muted-foreground">
                  Current: {selectedItem?.quantity} units | Threshold: {selectedItem?.low_stock_threshold}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                {adjustMode === 'add' && 'Quantity to Add'}
                {adjustMode === 'set' && 'New Quantity'}
                {adjustMode === 'threshold' && 'Low Stock Threshold'}
              </Label>
              <Input
                type="number"
                min="0"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
              {adjustMode === 'add' && adjustQuantity && (
                <p className="text-sm text-muted-foreground">
                  New total: {(selectedItem?.quantity || 0) + parseInt(adjustQuantity || '0')} units
                </p>
              )}
            </div>
            {adjustMode !== 'threshold' && (
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g., Restock delivery, Stock correction"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjust}>
              {adjustMode === 'add' && 'Add Stock'}
              {adjustMode === 'set' && 'Update'}
              {adjustMode === 'threshold' && 'Save Threshold'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              History: {selectedItemName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {selectedItemHistory.length > 0 ? (
              <div className="space-y-3 pr-4">
                {selectedItemHistory.map((entry) => {
                  const config = CHANGE_TYPE_CONFIG[entry.change_type] || CHANGE_TYPE_CONFIG.set;
                  const Icon = config.icon;
                  
                  return (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`mt-0.5 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{config.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <div className="text-sm mt-1">
                          {entry.quantity_before} → {entry.quantity_after}
                          <span className={`ml-2 font-medium ${entry.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({entry.quantity_change >= 0 ? '+' : ''}{entry.quantity_change})
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{entry.reason}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No history for this item
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
