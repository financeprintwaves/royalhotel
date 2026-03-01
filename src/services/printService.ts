// Unified Print Pipeline
// Cascading fallback: QZ Tray → Local HTTP Daemon → return false
// Browser print dialog is ONLY triggered by manual button in ReceiptDialog as last resort.

import { connectPrinter, silentPrint as qzSilentPrint } from './printerService';

// ─── Local HTTP Daemon ─────────────────────────────────────

async function printViaLocalDaemon(html: string, timeoutMs = 3000): Promise<boolean> {
  const url = 'http://localhost:3001/print';
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`Daemon responded ${res.status}`);
    return true;
  } catch {
    clearTimeout(id);
    return false;
  }
}

// ─── Printer Status ────────────────────────────────────────

export type PrintMethod = 'qz' | 'daemon' | 'none';

/** Check which silent print method is currently available. */
export async function getPrintStatus(): Promise<PrintMethod> {
  // Check QZ Tray first
  try {
    const qzConnected = await connectPrinter();
    if (qzConnected) return 'qz';
  } catch { /* ignore */ }

  // Check local daemon with a quick health ping
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('http://localhost:3001/health', { signal: controller.signal }).catch(() => null);
    clearTimeout(id);
    if (res?.ok) return 'daemon';
  } catch { /* ignore */ }

  return 'none';
}

// ─── Unified Silent Print ──────────────────────────────────

/**
 * Try to print HTML silently using the best available method.
 * Returns true if print was sent successfully, false if no method worked.
 * Does NOT open a browser print dialog — that's left to the caller.
 */
export async function silentPrintHTML(html: string): Promise<boolean> {
  // 1. Try QZ Tray (preferred — direct USB/network printer via websocket)
  try {
    const sent = await qzSilentPrint(html);
    if (sent) {
      console.log('[print] Sent via QZ Tray');
      return true;
    }
  } catch (err) {
    console.info('[print] QZ Tray unavailable:', err);
  }

  // 2. Try local HTTP daemon
  try {
    const sent = await printViaLocalDaemon(html);
    if (sent) {
      console.log('[print] Sent via local daemon');
      return true;
    }
  } catch (err) {
    console.info('[print] Local daemon unavailable:', err);
  }

  // 3. No silent method available
  console.info('[print] No silent print method available');
  return false;
}

// Keep backward-compatible default export
export default silentPrintHTML;
