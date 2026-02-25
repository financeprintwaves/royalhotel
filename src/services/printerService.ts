import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Dynamically import qz-tray (it attaches to window)
let qz: any = null;
let connectionPromise: Promise<void> | null = null;

async function loadQZ() {
  if (qz) return qz;
  try {
    const mod = await import('qz-tray');
    qz = mod.default || mod;
    return qz;
  } catch (err) {
    console.warn('QZ Tray module not available:', err);
    return null;
  }
}

// ─── Dynamic Printer Name from DB ──────────────────────────

let cachedPrinterName: string | null = null;
let cachedIsEnabled: boolean | null = null;
let cacheExpiry = 0;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchPrinterSettings(): Promise<{ printerName: string; isEnabled: boolean }> {
  const now = Date.now();
  if (cachedPrinterName && now < cacheExpiry) {
    return { printerName: cachedPrinterName, isEnabled: cachedIsEnabled ?? true };
  }

  try {
    // Get current user's branch
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { printerName: 'POS_PRINTER', isEnabled: true };

    const { data: profile } = await supabase
      .from('profiles')
      .select('branch_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.branch_id) return { printerName: 'POS_PRINTER', isEnabled: true };

    const { data } = await supabase
      .from('printer_settings')
      .select('printer_name, is_enabled')
      .eq('branch_id', profile.branch_id)
      .maybeSingle();

    cachedPrinterName = data?.printer_name || 'POS_PRINTER';
    cachedIsEnabled = data?.is_enabled ?? true;
    cacheExpiry = now + CACHE_TTL;

    return { printerName: cachedPrinterName, isEnabled: cachedIsEnabled };
  } catch {
    return { printerName: cachedPrinterName || 'POS_PRINTER', isEnabled: cachedIsEnabled ?? true };
  }
}

/** Clear cached settings (call after saving new settings) */
export function clearPrinterCache() {
  cachedPrinterName = null;
  cachedIsEnabled = null;
  cacheExpiry = 0;
}

/** Connect to QZ Tray websocket. Caches connection. */
export async function connectPrinter(): Promise<boolean> {
  const qzModule = await loadQZ();
  if (!qzModule) return false;

  // Already connected
  if (qzModule.websocket?.isActive()) return true;

  // Avoid duplicate connection attempts
  if (connectionPromise) {
    try { await connectionPromise; return true; } catch { return false; }
  }

  connectionPromise = qzModule.websocket.connect()
    .then(() => { console.log('QZ Tray connected'); })
    .catch((err: any) => {
      console.warn('QZ Tray connection failed:', err);
      throw err;
    })
    .finally(() => { connectionPromise = null; });

  try {
    await connectionPromise;
    return true;
  } catch {
    return false;
  }
}

/** Fire-and-forget print. Returns true if sent, false if skipped. */
async function silentPrint(html: string, overridePrinterName?: string): Promise<boolean> {
  try {
    const settings = await fetchPrinterSettings();
    if (!settings.isEnabled && !overridePrinterName) {
      console.log('Auto-print disabled in settings');
      return false;
    }

    const connected = await connectPrinter();
    if (!connected) {
      toast.warning('Printer not connected – QZ Tray is not running');
      return false;
    }
    const printerName = overridePrinterName || settings.printerName;
    const config = qz.configs.create(printerName);
    const data = [{ type: 'html', format: 'plain', data: html }];
    await qz.print(config, data);
    return true;
  } catch (err: any) {
    console.error('Silent print failed:', err);
    toast.warning('Print failed: ' + (err?.message || 'Unknown error'));
    return false;
  }
}

// ─── KOT HTML ───────────────────────────────────────────────

interface KOTItem {
  name: string;
  quantity: number;
  notes?: string | null;
  portionName?: string | null;
  isServing?: boolean;
}

export async function printKOT(
  tableName: string | null,
  items: KOTItem[],
  orderNumber?: string | null,
) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-GB');

  const itemRows = items.map(i => {
    let line = `<tr><td style="text-align:left">${i.quantity}x ${i.name}`;
    if (i.portionName) line += ` <small>(${i.portionName})</small>`;
    if (i.isServing) line += ` <small>(Serving)</small>`;
    line += `</td></tr>`;
    if (i.notes) line += `<tr><td style="padding-left:16px;font-size:11px">** ${i.notes}</td></tr>`;
    return line;
  }).join('');

  const html = `
<div style="width:280px;font-family:'Courier New',monospace;font-size:13px;padding:8px">
  <div style="text-align:center;font-weight:bold;font-size:15px">--- KITCHEN COPY ---</div>
  <div style="text-align:center;margin:4px 0">
    <b>${tableName || 'TAKEAWAY'}</b>
  </div>
  ${orderNumber ? `<div style="text-align:center;font-size:11px">Order: ${orderNumber}</div>` : ''}
  <div style="text-align:center;font-size:11px">${date} ${time}</div>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <table style="width:100%;font-size:13px">${itemRows}</table>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <div style="text-align:center;font-size:11px">Total Items: ${items.reduce((s, i) => s + i.quantity, 0)}</div>
</div>`;

  return silentPrint(html);
}

// ─── INVOICE HTML ───────────────────────────────────────────

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  portionName?: string | null;
  isServing?: boolean;
}

interface InvoiceData {
  orderNumber?: string | null;
  tableName?: string | null;
  waiterName?: string | null;
  branchName?: string;
  branchAddress?: string | null;
  branchPhone?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  isFOC?: boolean;
  focName?: string | null;
}

export async function printInvoice(data: InvoiceData) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('en-GB');

  const itemRows = data.items.map(i => {
    let name = i.name;
    if (i.portionName) name += ` (${i.portionName})`;
    if (i.isServing) name += ` (Srv)`;
    return `<tr>
      <td style="text-align:left">${i.quantity}x ${name}</td>
      <td style="text-align:right">${i.totalPrice.toFixed(3)}</td>
    </tr>`;
  }).join('');

  const html = `
<div style="width:280px;font-family:'Courier New',monospace;font-size:13px;padding:8px">
  <div style="text-align:center;font-weight:bold;font-size:15px">--- CUSTOMER BILL ---</div>
  <div style="text-align:center;font-weight:bold;margin:4px 0">${data.branchName || 'Restaurant'}</div>
  ${data.branchAddress ? `<div style="text-align:center;font-size:10px">${data.branchAddress}</div>` : ''}
  ${data.branchPhone ? `<div style="text-align:center;font-size:10px">Tel: ${data.branchPhone}</div>` : ''}
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  ${data.orderNumber ? `<div>Order: ${data.orderNumber}</div>` : ''}
  <div>${data.tableName || 'TAKEAWAY'}</div>
  <div style="font-size:11px">${date} ${time}</div>
  ${data.waiterName ? `<div style="font-size:11px">Waiter: ${data.waiterName}</div>` : ''}
  ${data.isFOC ? `<div style="font-weight:bold;font-size:14px;text-align:center;margin:4px 0">*** FOC – ${data.focName || ''} ***</div>` : ''}
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <table style="width:100%;font-size:13px">${itemRows}</table>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <table style="width:100%;font-size:13px">
    <tr><td>Subtotal</td><td style="text-align:right">${data.subtotal.toFixed(3)}</td></tr>
    ${data.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${data.discount.toFixed(3)}</td></tr>` : ''}
    <tr><td style="font-weight:bold;font-size:15px">TOTAL</td><td style="text-align:right;font-weight:bold;font-size:15px">${data.total.toFixed(3)} OMR</td></tr>
  </table>
  <div style="border-top:1px dashed #000;margin:6px 0"></div>
  <div>Paid by: ${data.paymentMethod.toUpperCase()}</div>
  <div style="text-align:center;margin-top:8px;font-size:11px">Thank you for your visit!</div>
</div>`;

  return silentPrint(html);
}
