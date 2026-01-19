import { forwardRef } from 'react';
import type { Order, Payment } from '@/types/pos';

interface ReceiptProps {
  order: Order;
  payments?: Payment[];
  branchName?: string;
  branchAddress?: string;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ order, payments = [], branchName = 'Restaurant POS', branchAddress }, ref) => {
    const orderItems = (order as any).order_items || [];
    const tableNumber = (order as any).table?.table_number;
    const customerName = (order as any).customer_name;
    const createdAt = order.created_at ? new Date(order.created_at) : new Date();
    
    const subtotal = Number(order.subtotal) || 0;
    const taxAmount = Number(order.tax_amount) || 0;
    const discountAmount = Number(order.discount_amount) || 0;
    const totalAmount = Number(order.total_amount) || 0;

    return (
      <div 
        ref={ref}
        className="bg-white text-black p-6 font-mono text-sm w-[300px] mx-auto"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {/* Header */}
        <div className="text-center border-b border-dashed border-gray-400 pb-4 mb-4">
          <h1 className="text-lg font-bold">{branchName}</h1>
          {branchAddress && <p className="text-xs mt-1">{branchAddress}</p>}
          <div className="text-xs mt-2">
            <p>Date: {createdAt.toLocaleDateString()}</p>
            <p>Time: {createdAt.toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Order Info */}
        <div className="border-b border-dashed border-gray-400 pb-4 mb-4">
          <p className="text-xs">
            <span className="font-bold">Order #:</span> {order.id.slice(-8).toUpperCase()}
          </p>
          {customerName && (
            <p className="text-xs">
              <span className="font-bold">Customer:</span> {customerName}
            </p>
          )}
          {tableNumber && (
            <p className="text-xs">
              <span className="font-bold">Table:</span> {tableNumber}
            </p>
          )}
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-gray-400 pb-4 mb-4">
          <div className="flex justify-between font-bold text-xs mb-2">
            <span>Item</span>
            <span>Total</span>
          </div>
          {orderItems.map((item: any) => (
            <div key={item.id} className="flex justify-between text-xs mb-1">
              <span className="flex-1">
                {item.quantity}x {item.menu_item?.name || 'Item'}
              </span>
              <span className="ml-2">${Number(item.total_price).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount:</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-400 pt-2 mt-2">
            <span>TOTAL:</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Info */}
        {payments.length > 0 && (
          <div className="border-t border-dashed border-gray-400 mt-4 pt-4">
            <p className="font-bold text-xs mb-2">Payment Details:</p>
            {payments.map((payment) => (
              <div key={payment.id} className="flex justify-between text-xs">
                <span className="capitalize">{payment.payment_method}</span>
                <span>${Number(payment.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t border-dashed border-gray-400">
          {customerName && <p className="text-xs font-medium mb-2">Thank you, {customerName}!</p>}
          <p className="text-xs">Thank you for your visit!</p>
          <p className="text-xs mt-1">Please come again</p>
        </div>

        {/* Print-only styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt-print-area, #receipt-print-area * {
              visibility: visible;
            }
            #receipt-print-area {
              position: absolute;
              left: 0;
              top: 0;
            }
          }
        `}</style>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';

export default Receipt;
