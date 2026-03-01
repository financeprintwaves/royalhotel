// Pre-renders receipt HTML from order data without React — under 50ms
import type { Order } from '@/types/pos';

interface BranchInfo {
  name?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
}

export function renderReceiptHTML(order: Order, branch?: BranchInfo): string {
  const orderItems = Array.isArray((order as any).order_items) ? (order as any).order_items : [];
  const tableNumber = (order as any).table?.table_number;
  const customerName = (order as any).customer_name;
  const createdAt = order.created_at ? new Date(order.created_at) : new Date();
  const totalAmount = Number(order.total_amount) || 0;
  const discountAmount = Number(order.discount_amount) || 0;
  const itemsTotal = orderItems.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);
  const branchName = branch?.name || 'Restaurant POS';
  const waiterName = (order as any).waiter?.full_name || (order as any).created_by_profile?.full_name;

  const logoHtml = branch?.logo_url
    ? `<img src="${branch.logo_url}" alt="${branchName}" style="width:40mm;max-height:20mm;object-fit:contain;margin:0 auto 8px auto;display:block" />`
    : '';

  const itemsHtml = orderItems.map((item: any) => {
    const name = item.menu_item?.name || 'Item';
    const portion = item.portion_name ? ` (${item.portion_name})` : '';
    return `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px">
      <span style="flex:1;margin-right:8px">${item.quantity}x ${name}${portion}</span>
      <span>${Number(item.total_price).toFixed(3)} OMR</span>
    </div>`;
  }).join('');

  const discountHtml = discountAmount > 0 ? `
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span>Subtotal:</span><span>${itemsTotal.toFixed(3)} OMR</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span>Discount:</span><span>-${discountAmount.toFixed(3)} OMR</span>
    </div>` : '';

  const focHtml = (order as any).is_foc ? `
    <div style="text-align:center;margin:12px 0;padding:8px;border:2px solid #000">
      <p style="font-size:20px;font-weight:bold;margin:0 0 4px 0">===== FOC =====</p>
      ${(order as any).foc_dancer_name ? `<p style="font-size:14px;font-weight:bold;margin:0">Person: ${(order as any).foc_dancer_name}</p>` : ''}
    </div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:0}
    @media print{@page{margin:0;size:80mm auto}}
  </style></head><body>
  <div style="background:#fff;color:#000;padding:8px 12px;font-family:'Courier New',Courier,monospace;font-size:12px;width:72mm;margin:0 auto;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact">
    <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px">
      ${logoHtml}
      <h1 style="font-size:18px;font-weight:bold;margin:0 0 4px 0;letter-spacing:.5px">${branchName}</h1>
      ${branch?.address ? `<p style="font-size:12px;margin:3px 0">${branch.address}</p>` : ''}
      ${branch?.phone ? `<p style="font-size:12px;margin:3px 0">Tel: ${branch.phone}</p>` : ''}
      <div style="margin-top:8px">
        <p style="font-size:12px;margin:3px 0">Date: ${createdAt.toLocaleDateString()}</p>
        <p style="font-size:12px;margin:3px 0">Time: ${createdAt.toLocaleTimeString()}</p>
      </div>
    </div>
    <div style="border-bottom:1px solid #000;padding-bottom:10px;margin-bottom:10px">
      <p style="font-size:16px;font-weight:bold;text-align:center;margin-bottom:8px">
        #${order.order_number || order.id.slice(-8).toUpperCase()}
      </p>
      ${customerName ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span style="font-weight:bold">Customer:</span><span>${customerName}</span></div>` : ''}
      ${tableNumber ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span style="font-weight:bold">Table:</span><span>${tableNumber}</span></div>` : ''}
      ${waiterName ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span style="font-weight:bold">Served by:</span><span>${waiterName}</span></div>` : ''}
    </div>
    <div style="display:flex;justify-content:space-between;font-weight:bold;margin-bottom:8px"><span>Item</span><span>Total</span></div>
    <div style="border-bottom:1px solid #000;padding-bottom:10px;margin-bottom:10px">${itemsHtml}</div>
    <div>
      ${discountHtml}
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;border-top:2px solid #000;padding-top:8px;margin-top:8px">
        <span>TOTAL:</span><span>${totalAmount.toFixed(3)} OMR</span>
      </div>
    </div>
    ${focHtml}
    <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid #000;font-size:12px">
      ${customerName ? `<p style="font-weight:500;margin-bottom:8px">Thank you, ${customerName}!</p>` : ''}
      <p>Thank you for your visit!</p>
      <p style="margin-top:4px">Please come again</p>
    </div>
  </div>
  </body></html>`;
}
