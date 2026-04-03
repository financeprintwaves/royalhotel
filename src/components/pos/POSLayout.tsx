import React, { useEffect, useState, useRef } from 'react';
import { usePOSContext } from '@/contexts/POSContext';
import { useCategories, useMenuItems } from '@/hooks/useMenuData';
import { useResponsive } from '@/hooks/useResponsive';
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
  const { deviceType, isMobile, isTablet, isDesktop } = useResponsive();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showKOTDialog, setShowKOTDialog] = useState(false);
  const [showHoldOrders, setShowHoldOrders] = useState(false);
  const [leftWidth, setLeftWidth] = useState(30);
  const [centerWidth, setCenterWidth] = useState(45);
  const [rightWidth, setRightWidth] = useState(25);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle panel resizing
  useEffect(() => {
    if (!isDraggingLeft && !isDraggingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const cursorX = e.clientX - container.getBoundingClientRect().left;
      const cursorPercent = (cursorX / containerWidth) * 100;

      if (isDraggingLeft) {
        // Dragging divider between left and center
        const newLeft = Math.max(20, Math.min(50, cursorPercent));
        const newCenter = Math.max(25, Math.min(65, 100 - newLeft - rightWidth));
        setLeftWidth(newLeft);
        setCenterWidth(newCenter);
      } else if (isDraggingRight) {
        // Dragging divider between center and right
        const newRight = Math.max(15, Math.min(40, 100 - cursorPercent));
        const newCenter = Math.max(25, Math.min(65, 100 - leftWidth - newRight));
        setCenterWidth(newCenter);
        setRightWidth(newRight);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight, leftWidth, rightWidth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-lg text-muted-foreground">Loading menu...</div>
      </div>
    );
  }

  // Mobile Layout: Single column with drawers (320px - 767px)
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 overflow-hidden">
        {/* Header - Compact */}
        <div className="flex-shrink-0 bg-blue-700 p-2 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <POSTableSelector compact />
            <div className="text-sm font-bold text-white truncate flex-1 text-center">
              {orderType === 'takeout' ? '🛍️ Take Out' : selectedTableName || 'Select Table'}
            </div>
            <div className="text-xs text-blue-200 bg-blue-600 px-2 py-1 rounded-md font-semibold">
              {cartItems.length} items
            </div>
          </div>
          <div className="text-center text-xl font-bold text-white mt-1 tabular-nums">
            ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <POSMenuPanel compact />
        </div>

        {/* Bottom Controls - Compact */}
        <div className="flex-shrink-0 bg-gradient-to-t from-white to-blue-50 dark:from-blue-900 dark:to-blue-800 p-2">
          <div className="flex gap-1">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="flex-1 aspect-square bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-semibold transition-all duration-200 shadow-sm"
            >
              🖨️ KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="flex-1 aspect-square bg-blue-700 hover:bg-blue-600 disabled:bg-blue-500 disabled:hover:bg-blue-500 text-white rounded text-sm font-semibold transition-all duration-200 shadow-sm disabled:transform-none disabled:cursor-not-allowed"
            >
              💳 Pay
            </button>
          </div>
        </div>

        {/* Dialogs */}
        {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
        {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      </div>
    );
  }

  // Tablet Layout: 2 columns with overlays (768px - 1023px)
  if (isTablet) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 overflow-hidden">
        {/* Left: Order Panel + Cart */}
        <div className="w-1/3 border-r border-blue-300 dark:border-blue-700 bg-gradient-to-b from-white to-blue-50 dark:from-blue-900 dark:to-blue-800 flex flex-col overflow-hidden rounded-r-lg shadow-lg">
          <div className="flex-shrink-0 bg-blue-700 p-3 shadow-md">
            <POSTableSelector />
            <div className="text-center text-xl font-bold text-white mt-2 tabular-nums">
              ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <POSOrderPanel />
          </div>
          <div className="flex-shrink-0 p-3 space-y-2 bg-gradient-to-t from-white to-blue-50 dark:from-blue-900 dark:to-blue-800">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="w-full aspect-square bg-blue-700 hover:bg-blue-600 text-white rounded font-semibold transition-all duration-200 shadow-sm"
            >
              🖨️ Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="w-full aspect-square bg-blue-700 hover:bg-blue-600 disabled:bg-blue-500 disabled:hover:bg-blue-500 text-white rounded font-semibold transition-all duration-200 shadow-sm disabled:transform-none disabled:cursor-not-allowed"
            >
              💳 Payment
            </button>
          </div>
        </div>

        {/* Right: Menu */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-l-lg">
          <POSMenuPanel />
        </div>

        {/* Dialogs */}
        {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
        {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      </div>
    );
  }

  // Desktop Layout: 3 resizable panels (30% - 45% - 25%)
  return (
    <div ref={containerRef} className="flex h-screen bg-blue-900 overflow-hidden relative">
      {/* Left Sidebar: Order Summary (30%) */}
      <div style={{ flex: `0 0 ${leftWidth}%` }} className="border-r border-blue-700 bg-blue-800 flex flex-col overflow-hidden shadow-lg relative min-w-0">
        {/* Header with Total */}
        <div className="flex-shrink-0 bg-blue-700 p-3 shadow-md relative overflow-hidden">
          <h2 className="text-xs font-bold text-blue-300 uppercase tracking-widest">💰 TOTAL</h2>
          <div className="text-2xl font-bold text-white mt-1 tabular-nums tracking-tight">
            ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
          </div>
          <p className="text-blue-300 text-xs mt-1 font-semibold">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Order Items */}
        <div className="flex-1 overflow-y-auto p-3 relative z-10">
          <POSOrderPanel />
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 p-2 border-t border-blue-700 space-y-1 bg-blue-900 relative z-10">
          <button
            onClick={() => setShowHoldOrders(true)}
            className="w-full aspect-square bg-blue-700 hover:bg-blue-600 text-white rounded font-bold transition-colors duration-200 text-xs uppercase tracking-wider"
          >
            ⏸️ Hold
          </button>
          <button
            onClick={() => setShowKOTDialog(true)}
            className="w-full aspect-square bg-blue-700 hover:bg-blue-600 text-white rounded font-bold transition-colors duration-200 text-xs uppercase tracking-wider"
          >
            🖨️ Print KOT
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            disabled={cartItems.length === 0}
            className="w-full aspect-square bg-blue-700 hover:bg-blue-600 disabled:bg-blue-800 disabled:hover:bg-blue-800 text-white rounded font-bold transition-colors duration-200 disabled:cursor-not-allowed text-xs uppercase tracking-wider"
          >
            💳 Payment
          </button>
        </div>
      </div>

      {/* Resize Handle 1 (Left-Center) */}
      <div
        onMouseDown={() => setIsDraggingLeft(true)}
        className={`w-1 bg-blue-700 hover:bg-blue-600 cursor-col-resize transition-colors duration-200 ${isDraggingLeft ? 'bg-blue-500' : ''}`}
      />

      {/* Center: Menu Items (45%) */}
      <div style={{ flex: `0 0 ${centerWidth}%` }} className="flex flex-col overflow-hidden bg-blue-900 relative min-w-0">
        <div className="relative z-10 h-full">
          <POSMenuPanel />
        </div>
      </div>

      {/* Resize Handle 2 (Center-Right) */}
      <div
        onMouseDown={() => setIsDraggingRight(true)}
        className={`w-1 bg-blue-700 hover:bg-blue-600 cursor-col-resize transition-colors duration-200 ${isDraggingRight ? 'bg-blue-500' : ''}`}
      />

      {/* Right Sidebar: Action Panel (25%) */}
      <div style={{ flex: `0 0 ${rightWidth}%` }} className="border-l border-blue-700 bg-blue-800 flex flex-col overflow-hidden shadow-lg relative min-w-0">
        <div className="relative z-10 h-full">
          <POSActionPanel />
        </div>
      </div>

      {/* Dialogs */}
      {showPaymentDialog && <PaymentDialog onClose={() => setShowPaymentDialog(false)} />}
      {showKOTDialog && <KOTPrintDialog onClose={() => setShowKOTDialog(false)} />}
      {showHoldOrders && <HoldOrdersPanel onClose={() => setShowHoldOrders(false)} />}
    </div>
  );
}
