import React, { useEffect, useState } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useCategories, useMenuItems } from '@/hooks/useMenuData';
import { useIsMobile } from '@/hooks/use-mobile';
import POSTableSelector from './POSTableSelector';
import POSOrderPanel from './POSOrderPanel';
import POSMenuPanel from './POSMenuPanel';
import POSActionPanel from './POSActionPanel';
import PaymentDialog from './PaymentDialog';
import KOTPrintDialog from './KOTPrintDialog';
import HoldOrdersPanel from './HoldOrdersPanel';

export default function POSLayout() {
  const { orderType, selectedTableId, selectedTableName, cartItems, currentOrder } =
    usePOSContext();
  const { data: categories = [], isLoading } = useCategories();
  const isMobile = useIsMobile();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showKOTDialog, setShowKOTDialog] = useState(false);
  const [showHoldOrders, setShowHoldOrders] = useState(false);

  // Initialize order on table selection
  useEffect(() => {
    if (!currentOrder && selectedTableId) {
      // Order will be created when first item is added
    }
  }, [selectedTableId, currentOrder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-lg text-muted-foreground">Loading menu...</div>
      </div>
    );
  }

  // Mobile Layout: Single column with drawers
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <POSTableSelector compact />
            <div className="text-sm font-semibold">
              {orderType === 'takeout' ? 'Take Out' : selectedTableName || 'Select Table'}
            </div>
            <div className="text-xs text-muted-foreground">Items: {cartItems.length}</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <POSMenuPanel compact />
        </div>

        {/* Bottom Controls */}
        <div className="flex-shrink-0 border-t bg-card p-3 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold"
            >
              Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-50"
            >
              Payment
            </button>
          </div>
        </div>

        {/* Dialogs */}
        {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
        {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      </div>
    );
  }

  // Tablet Layout: 2 columns with overlays
  if (window.innerWidth < 1024) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Left: Order Panel + Cart */}
        <div className="w-1/3 border-r bg-card flex flex-col overflow-hidden">
          <POSTableSelector />
          <div className="flex-1 overflow-y-auto">
            <POSOrderPanel />
          </div>
          <div className="flex-shrink-0 p-3 border-t space-y-2">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold"
            >
              Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm font-semibold disabled:opacity-50"
            >
              Payment
            </button>
          </div>
        </div>

        {/* Right: Menu */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <POSMenuPanel />
        </div>

        {/* Dialogs */}
        {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
        {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      </div>
    );
  }

  // Desktop Layout: 4 columns
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar: Order Summary + Hold Orders */}
      <div className="w-60 border-r bg-card flex flex-col overflow-hidden">
        <div className="flex-shrink-0 p-3 border-b">
          <h2 className="text-lg font-bold text-green-600">SALE TOTAL</h2>
          <div className="text-3xl font-bold text-white mt-1">
            ${cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 p-3">
          <POSOrderPanel />
        </div>

        <div className="flex-shrink-0 p-3 border-t space-y-2">
          <button
            onClick={() => setShowHoldOrders(true)}
            className="w-full px-2 py-2 bg-yellow-500 text-black rounded text-xs font-semibold hover:bg-yellow-600"
          >
            Hold Orders
          </button>
          <button
            onClick={() => setShowKOTDialog(true)}
            className="w-full px-2 py-2 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
          >
            Print KOT
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            disabled={cartItems.length === 0}
            className="w-full px-2 py-2 bg-green-600 text-white rounded text-xs font-semibold disabled:opacity-50 hover:bg-green-700"
          >
            Payment
          </button>
        </div>
      </div>

      {/* Center-Left: Category Navigation */}
      <div className="w-56 border-r bg-background flex flex-col overflow-hidden">
        <POSMenuPanel showCategoriesOnly />
      </div>

      {/* Center-Right: Menu Items Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <POSMenuPanel />
      </div>

      {/* Right Sidebar: Payment + Function Buttons */}
      <div className="w-56 border-l bg-card flex flex-col overflow-hidden">
        <POSActionPanel />
      </div>

      {/* Dialogs */}
      {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
      {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      {showHoldOrders && <HoldOrdersPanel onClose={() => setShowHoldOrders(false)} />}
    </div>
  );
}
