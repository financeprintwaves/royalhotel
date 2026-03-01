// AFS Card Terminal Integration
// Sends payment amount to local daemon which proxies to AFS Nexgo terminal
// AFS Gateway: https://172.28.28.26:21105 / apex.smartpos.gateway

export interface AfsPaymentResult {
  success: boolean;
  reference?: string;
  error?: string;
}

/**
 * Send payment amount to AFS card terminal via local daemon proxy.
 * The daemon forwards the request to the AFS Nexgo terminal over HTTPS.
 * 
 * @param amount - Payment amount in OMR (3 decimal places)
 * @returns Result with success flag and transaction reference
 */
export async function sendToAfsTerminal(amount: number): Promise<AfsPaymentResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for card swipe

  try {
    const res = await fetch('http://localhost:3001/pay-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'OMR' }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `Terminal responded with ${res.status}: ${text}` };
    }

    const data = await res.json();
    return {
      success: data.success ?? false,
      reference: data.reference || data.transactionRef || data.ref || undefined,
      error: data.error || undefined,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return { success: false, error: 'Card terminal timed out. Please try again.' };
    }

    return {
      success: false,
      error: 'Cannot reach card terminal. Make sure the local service is running.',
    };
  }
}

/**
 * Check if the AFS terminal daemon is reachable.
 */
export async function isAfsTerminalAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('http://localhost:3001/health', { signal: controller.signal }).catch(() => null);
    clearTimeout(id);
    return res?.ok ?? false;
  } catch {
    return false;
  }
}
