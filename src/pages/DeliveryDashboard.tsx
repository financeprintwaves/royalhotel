import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { listDeliveryDrivers, assignDeliveryOrder, listDeliveryAssignments, updateDeliveryStatus } from '@/services/deliveryService';
import { getInventory } from '@/services/inventoryService';
import { requestInventoryTransfer, getTransferRequests, updateTransferRequestStatus } from '@/services/inventorySyncService';
import type { DeliveryAssignment, DeliveryDriver, InventoryTransferRequest } from '@/types/pos';

export default function DeliveryDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [transferRequests, setTransferRequests] = useState<InventoryTransferRequest[]>([]);

  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedTransferInventoryId, setSelectedTransferInventoryId] = useState('');
  const [selectedToBranchId, setSelectedToBranchId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);

  async function load() {
    try {
      const [driverData, assignmentData, inventoryData, transferData] = await Promise.all([
        listDeliveryDrivers(),
        listDeliveryAssignments(profile?.branch_id || ''),
        getInventory(),
        getTransferRequests(profile?.branch_id),
      ]);
      setDrivers(driverData);
      setAssignments(assignmentData);
      setInventory(inventoryData);
      setTransferRequests(transferData);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    load();
  }, [profile?.branch_id]);

  const handleAssignDelivery = async () => {
    if (!selectedDriverId || !selectedOrderId || !profile?.branch_id) {
      toast({ title: 'Select driver + order', description: 'Please choose an order and driver first.', variant: 'destructive' });
      return;
    }

    try {
      await assignDeliveryOrder({
        order_id: selectedOrderId,
        driver_id: selectedDriverId,
        branch_id: profile.branch_id,
        assigned_by: profile?.id || '',
        eta_minutes: 20,
      });
      toast({ title: 'Assigned', description: 'Delivery order assigned successfully.' });
      await load();
    } catch (error) {
      toast({ title: 'Assignment failed', description: (error as Error).message ?? 'Unable to assign delivery order', variant: 'destructive' });
    }
  };

  const handleCreateTransfer = async () => {
    if (!selectedTransferInventoryId || !selectedToBranchId || !profile?.branch_id) {
      toast({ title: 'Need data', description: 'Select inventory and destination branch first.', variant: 'destructive' });
      return;
    }

    try {
      await requestInventoryTransfer({
        from_branch_id: profile.branch_id,
        to_branch_id: selectedToBranchId,
        inventory_id: selectedTransferInventoryId,
        quantity: transferQuantity,
        requested_by: profile.id || '',
      });
      toast({ title: 'Transfer requested', description: 'Cross-branch inventory transfer requested.' });
      await load();
    } catch (error) {
      toast({ title: 'Transfer failed', description: (error as Error).message ?? 'Could not request transfer', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Delivery & Inventory Sync Dashboard</h1>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 items-end">
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Order ID" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={a.order_id}>{a.order_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>{driver.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignDelivery}>Assign</Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {assignments.length === 0 ? 'No delivery assignments yet.' : `${assignments.length} delivery assignment(s)`}
            </div>
            <div>
              {assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg px-3 py-2 mb-2">
                  <div className="font-semibold">Order {assignment.order_id}</div>
                  <div>Driver: {assignment.driver?.full_name ?? 'TBD'}</div>
                  <div>Status: {assignment.status}</div>
                  <div className="flex gap-2 mt-2">
                    {(['en_route', 'arrived', 'delivered', 'cancelled'] as const).map((statusOption) => (
                      <Button
                        key={statusOption}
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await updateDeliveryStatus(assignment.id, statusOption);
                          await load();
                        }}
                      >
                        {statusOption}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cross-Branch Inventory Transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Select value={selectedTransferInventoryId} onValueChange={setSelectedTransferInventoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Inventory" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.menu_item?.name ?? 'Unknown'} ({item.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="number"
                min={1}
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(Number(e.target.value))}
                className="input input-bordered w-full"
                placeholder="Quantity"
              />
            </div>
            <input
              value={selectedToBranchId}
              onChange={(e) => setSelectedToBranchId(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Destination Branch ID"
            />
            <Button onClick={handleCreateTransfer}>Create Transfer Request</Button>

            <div>
              <p className="font-semibold">Requests</p>
              {transferRequests.map((req) => (
                <div key={req.id} className="border rounded-lg p-2 mb-2">
                  <div>ID: {req.id}</div>
                  <div>Status: {req.status}</div>
                  <div>Qty: {req.quantity}</div>
                  <div>From: {req.from_branch_id}</div>
                  <div>To: {req.to_branch_id}</div>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await updateTransferRequestStatus({ requestId: req.id, status: 'approved', approved_by: profile?.id });
                        await load();
                      }}
                    >Approve</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        await updateTransferRequestStatus({ requestId: req.id, status: 'rejected', approved_by: profile?.id });
                        await load();
                      }}
                    >Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
