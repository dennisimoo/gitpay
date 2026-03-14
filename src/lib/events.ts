/** In-memory SSE broadcast bus. */
type SSECallback = (data: string) => void;

const g = global as typeof global & {
  _sseClients: Map<string, SSECallback>;
};

if (!g._sseClients) g._sseClients = new Map();

export function addSSEClient(id: string, cb: SSECallback) {
  g._sseClients.set(id, cb);
}

export function removeSSEClient(id: string) {
  g._sseClients.delete(id);
}

export function emitEvent(type: string, data: unknown) {
  const payload = JSON.stringify({ type, data });
  g._sseClients.forEach((cb) => {
    try {
      cb(payload);
    } catch {
      // client disconnected
    }
  });
}
