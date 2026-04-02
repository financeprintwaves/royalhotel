import { toast } from 'sonner';

// ─── Simplified Printer Service (Printing disabled) ──────────────

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
): Promise<boolean> {
  toast.info('Print KOT: ' + (tableName || 'Takeaway'));
  return true;
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

export async function printInvoice(data: InvoiceData): Promise<boolean> {
  toast.info(`Print Invoice: ${data.tableName || 'Takeaway'} - ${data.total.toFixed(3)} ${data.paymentMethod}`);
  return true;
}

