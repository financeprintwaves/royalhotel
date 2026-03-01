// Unified Print Pipeline — Local HTTP Daemon only
// Browser print dialog is ONLY triggered by manual button in ReceiptDialog as last resort.

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

export type PrintMethod = 'daemon' | 'none';

/** Check whether the local print daemon is reachable. */
export async function getPrintStatus(): Promise<PrintMethod> {
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
 * Try to print HTML silently via the local daemon.
 * Returns true if print was sent successfully, false otherwise.
 * Does NOT open a browser print dialog — that's left to the caller.
 */
export async function silentPrintHTML(html: string): Promise<boolean> {
  try {
    const sent = await printViaLocalDaemon(html);
    if (sent) {
      console.log('[print] Sent via local daemon');
      return true;
    }
  } catch (err) {
    console.info('[print] Local daemon unavailable:', err);
  }

  console.info('[print] No silent print method available');
  return false;
}

export default silentPrintHTML;
