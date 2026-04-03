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
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-300 dark:border-slate-700 bg-slate-700 p-3 md:p-4 rounded-b-lg shadow-md">
          <div className="flex items-center justify-between gap-2 md:gap-3 mb-2">
            <POSTableSelector compact />
            <div className="text-sm md:text-base font-bold text-white truncate">
              {orderType === 'takeout' ? '🛍️ Take Out' : selectedTableName || 'Select Table'}
            </div>
            <div className="text-xs md:text-sm text-slate-200 bg-slate-600 px-2 py-1 rounded-md font-semibold">
              {cartItems.length} items
            </div>
          </div>
          <div className="text-right text-2xl font-bold text-white tabular-nums">
            ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <POSMenuPanel compact />
        </div>

        {/* Bottom Controls */}
        <div className="flex-shrink-0 border-t border-slate-300 dark:border-slate-700 bg-gradient-to-t from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-3 md:p-4 space-y-3 rounded-t-lg shadow-xl">
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-all duration-200 min-h-[44px] shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🖨️ Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-500 disabled:hover:bg-slate-500 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-all duration-200 min-h-[44px] shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
            >
              💳 Payment
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
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
        {/* Left: Order Panel + Cart */}
        <div className="w-1/3 border-r border-slate-300 dark:border-slate-700 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 flex flex-col overflow-hidden rounded-r-lg shadow-lg">
          <div className="flex-shrink-0 bg-slate-700 p-4 rounded-br-lg shadow-md">
            <POSTableSelector />
            <div className="text-right text-2xl font-bold text-white mt-2 tabular-nums">
              ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <POSOrderPanel />
          </div>
          <div className="flex-shrink-0 p-4 border-t border-slate-300 dark:border-slate-700 space-y-3 rounded-t-lg bg-gradient-to-t from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
            <button
              onClick={() => setShowKOTDialog(true)}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all duration-200 min-h-[44px] shadow-md hover:shadow-lg transform hover:scale-105"
            >
              🖨️ Print KOT
            </button>
            <button
              onClick={() => setShowPaymentDialog(true)}
              disabled={cartItems.length === 0}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-500 disabled:hover:bg-slate-500 text-white rounded-lg font-semibold transition-all duration-200 min-h-[44px] shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
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
    <div ref={containerRef} className="flex h-screen bg-slate-900 overflow-hidden relative">
      {/* Left Sidebar: Order Summary (30%) */}
      <div style={{ flex: `0 0 ${leftWidth}%` }} className="border-r border-slate-700 bg-slate-800 flex flex-col overflow-hidden shadow-lg relative min-w-0">
        {/* Header with Total */}
        <div className="flex-shrink-0 bg-slate-700 p-4 shadow-md relative overflow-hidden">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">💰 TOTAL</h2>
          <div className="text-3xl font-bold text-white mt-2 tabular-nums tracking-tight">
            ${cartItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0).toFixed(2)}
          </div>
          <p className="text-slate-300 text-xs mt-1 font-semibold">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Order Items */}
        <div className="flex-1 overflow-y-auto p-3 relative z-10">
          <POSOrderPanel />
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 p-3 border-t border-slate-700 space-y-2 bg-slate-900 relative z-10">
          <button
            onClick={() => setShowHoldOrders(true)}
            className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors duration-200 min-h-[40px] shadow-md text-xs uppercase tracking-wider"
          >
            ⏸️ Hold
          </button>
          <button
            onClick={() => setShowKOTDialog(true)}
            className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors duration-200 min-h-[40px] shadow-md text-xs uppercase tracking-wider"
          >
            🖨️ Print KOT
          </button>
          <button
            onClick={() => setShowPaymentDialog(true)}
            disabled={cartItems.length === 0}
            className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:hover:bg-slate-800 text-white rounded font-bold transition-colors duration-200 min-h-[40px] shadow-md disabled:cursor-not-allowed text-xs uppercase tracking-wider"
          >
            💳 Payment
          </button>
        </div>
      </div>

      {/* Resize Handle 1 (Left-Center) */}
      <div
        onMouseDown={() => setIsDraggingLeft(true)}
        className={`w-1 bg-slate-700 hover:bg-slate-600 cursor-col-resize transition-colors duration-200 ${isDraggingLeft ? 'bg-blue-500' : ''}`}
      />

      {/* Center: Menu Items (45%) */}
      <div style={{ flex: `0 0 ${centerWidth}%` }} className="flex flex-col overflow-hidden bg-slate-900 relative min-w-0">
        <div className="relative z-10 h-full">
          <POSMenuPanel />
        </div>
      </div>

      {/* Resize Handle 2 (Center-Right) */}
      <div
        onMouseDown={() => setIsDraggingRight(true)}
        className={`w-1 bg-slate-700 hover:bg-slate-600 cursor-col-resize transition-colors duration-200 ${isDraggingRight ? 'bg-blue-500' : ''}`}
      />

      {/* Right Sidebar: Action Panel (25%) */}
      <div style={{ flex: `0 0 ${rightWidth}%` }} className="border-l border-slate-700 bg-slate-800 flex flex-col overflow-hidden shadow-lg relative min-w-0">
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
