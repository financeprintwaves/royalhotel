// Client for sending receipt HTML to a local print daemon.
// The daemon should accept POST /print with JSON { html: string } and
// print it to the default OS printer. This allows printing without
// browser print dialog.
export async function printToLocalPrinter(html: string, options?: { url?: string, timeoutMs?: number }) {
  const url = options?.url || 'http://localhost:3001/print';
  const timeoutMs = options?.timeoutMs ?? 3000;

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
    if (!res.ok) {
      throw new Error(`Printer service responded ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export default printToLocalPrinter;
