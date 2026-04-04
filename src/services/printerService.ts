// Printer service for handling KOT and receipt printing
// This service sends HTML to a local print daemon for silent printing

import printToLocalPrinter from './printService';

export async function printKOT(tableName: string, items: any[], orderNumber: string): Promise<boolean> {
  try {
    const html = generateKOTHTML(tableName, items, orderNumber);
    await printToLocalPrinter(html);
    return true;
  } catch (error) {
    console.error('KOT printing failed:', error);
    return false;
  }
}

export async function printReceipt(order: any): Promise<boolean> {
  try {
    const html = generateReceiptHTML(order);
    await printToLocalPrinter(html);
    return true;
  } catch (error) {
    console.error('Receipt printing failed:', error);
    return false;
  }
}

function generateKOTHTML(tableName: string, items: any[], orderNumber: string): string {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  const itemsHTML = items.map(item =>
    `<div style="display: flex; justify-content: space-between; margin: 4px 0;">
      <span>${item.name}</span>
      <span style="font-weight: bold;">× ${item.quantity}</span>
    </div>`
  ).join('');

  return `
    <html>
    <head>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .border { border: 1px solid black; padding: 8px; margin: 4px 0; }
      </style>
    </head>
    <body>
      <div class="center bold border">
        ════════════════════════════════<br/>
        KITCHEN ORDER TICKET<br/>
        ════════════════════════════════
      </div>
      <div class="center">
        ${tableName} | ${timeString}<br/>
        Order: ${orderNumber}
      </div>
      <div class="border">
        ${itemsHTML}
      </div>
      <div class="center">
        ════════════════════════════════<br/>
        ${now.toLocaleDateString()} ${timeString}
      </div>
    </body>
    </html>
  `;
}

function generateReceiptHTML(order: any): string {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  const itemsHTML = order.order_items?.map((item: any) =>
    `<div style="display: flex; justify-content: space-between; margin: 2px 0;">
      <span>${item.menu_item?.name || 'Unknown Item'}</span>
      <span>$${item.total_price?.toFixed(2) || '0.00'}</span>
    </div>`
  ).join('') || '';

  return `
    <html>
    <head>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 10px; margin: 0; padding: 8px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .right { text-align: right; }
        .border { border-top: 1px dashed black; margin: 4px 0; padding-top: 4px; }
      </style>
    </head>
    <body>
      <div class="center bold">
        RESTAURANT NAME<br/>
        123 Main Street<br/>
        City, State 12345<br/>
        Phone: (555) 123-4567
      </div>
      <div class="border center">
        RECEIPT<br/>
        Order: ${order.order_number || 'N/A'}<br/>
        ${now.toLocaleDateString()} ${timeString}
      </div>
      <div>
        ${itemsHTML}
      </div>
      <div class="border right bold">
        Total: $${order.total_amount?.toFixed(2) || '0.00'}
      </div>
      <div class="center">
        Thank you for your business!<br/>
        Please come again.
      </div>
    </body>
    </html>
  `;
}

export async function printInvoice(order: any): Promise<boolean> {
  console.log('Printing invoice:', order);
  // TODO: Implement actual invoice printing logic
  return true;
}

export async function getPrinters(branchId?: string): Promise<any[]> {
  console.log('Getting printers for branch:', branchId);
  // TODO: Implement actual printer discovery logic
  return [];
}

export async function testPrinter(printerId: string): Promise<boolean> {
  console.log('Testing printer:', printerId);
  // TODO: Implement actual printer testing logic
  return true;
}

