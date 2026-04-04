import { Order } from '@/types/pos';

/**
 * Format order for KOT (Kitchen Order Ticket) printing
 * KOT does NOT include prices - for kitchen staff only
 */
export function formatKOTForPrint(order: Order, items: any[]): string {
  const now = new Date();
  const orderTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const kotContent = `
${'='.repeat(40)}
KITCHEN ORDER TICKET
${'='.repeat(40)}
Order #: ${order.id}
Table: ${order.table_id || 'TAKE OUT'} | Time: ${orderTime}
Date: ${now.toLocaleDateString()}
${'-'.repeat(40)}
ITEM NAME                              QTY
${'-'.repeat(40)}
${items
  .map(
    (item) =>
      `${item.description.padEnd(33)} ${item.quantity.toString().padStart(3)}`
  )
  .join('\n')}
${'-'.repeat(40)}
Special Instructions: ${order.notes || 'None'}
${'-'.repeat(40)}
${new Date().toLocaleTimeString()}
  `;

  return kotContent;
}

/**
 * Format order for receipt printing
 * Receipt INCLUDES prices - for customer
 */
export function formatReceiptForPrint(order: Order, items: any[]): string {
  const now = new Date();
  const orderTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const tax = subtotal * 0.1; // 10% tax
  const discount = (order as any).discount_amount || 0;
  const total = subtotal + tax - discount;

  const receiptContent = `
${'='.repeat(40)}
ROYAL HOTEL BISTRO
Receipt
${'='.repeat(40)}
Order #: ${order.id}  |  Table: ${order.table_id || 'TAKE OUT'}
Date: ${now.toLocaleDateString()} | Time: ${orderTime}
${'-'.repeat(40)}
DESCRIPTION                    QTY TOTAL
${'-'.repeat(40)}
${items
  .map(
    (item) =>
      `${item.description.substring(0, 28).padEnd(28)} ${item.quantity
        .toString()
        .padStart(3)} ${item.total_price.toFixed(2).padStart(7)}`
  )
  .join('\n')}
${'-'.repeat(40)}
Subtotal:                    ${subtotal.toFixed(2).padStart(7)}
Tax (10%):                   ${tax.toFixed(2).padStart(7)}
${discount > 0 ? `Discount (${Math.round((discount / subtotal) * 100)}%):      -${discount.toFixed(2).padStart(6)}` : ''}
${'-'.repeat(40)}
TOTAL:                       ${total.toFixed(2).padStart(7)}
${'-'.repeat(40)}
Payment Method: ${((order as any).payment_method || 'CASH').toUpperCase()}
Amount Paid: ${((order as any).total_amount || total).toFixed(2).padStart(7)}
Change: 0.00
${'-'.repeat(40)}
Thank you for your order!
${'='.repeat(40)}
  `;

  return receiptContent;
}

/**
 * Calculate order totals with tax and discount
 */
export function calculateOrderTotals(items: any[], discountAmount: number = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax - discountAmount;

  return {
    subtotal,
    tax,
    discount: discountAmount,
    total,
  };
}

/**
 * Generate KOT print data
 */
export function generateKOTPrintData(order: any, items: any[]) {
  return {
    documentType: 'KOT',
    orderId: order.id,
    tableId: order.table_id,
    orderTime: new Date(),
    items: items.map((item) => ({
      name: item.description,
      quantity: item.quantity,
      notes: item.notes,
    })),
  };
}

/**
 * Generate receipt print data
 */
export function generateReceiptPrintData(order: any, items: any[], payment: any) {
  const { subtotal, tax, discount, total } = calculateOrderTotals(
    items,
    order.discount || 0
  );

  return {
    documentType: 'RECEIPT',
    orderId: order.id,
    tableId: order.table_id,
    orderTime: new Date(),
    items: items.map((item) => ({
      name: item.description,
      quantity: item.quantity,
      price: item.unit_price,
      total: item.total_price,
    })),
    subtotal,
    tax,
    discount,
    total,
    payment: {
      method: payment.payment_method,
      amount: payment.amount,
      tip: payment.tip || 0,
      change: payment.change || 0,
    },
  };
}
