/**
 * Main-thread client of the sheets worker (sheets.worker.ts): typed calls, started on first use.
 */
import type { SheetsMethod, SheetsMethods, SheetsRequest, SheetsResponse } from './sheets.worker.ts';

interface Pending {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function sheetsWorker(): Worker {
  if (worker !== null) return worker;
  const created = new Worker(new URL('./sheets.worker.ts', import.meta.url), { type: 'module' });
  created.addEventListener('message', (event: MessageEvent<SheetsResponse>) => {
    const response = event.data;
    const call = pending.get(response.id);
    if (call === undefined) return;
    pending.delete(response.id);
    if (response.ok) call.resolve(response.result);
    else call.reject(new Error(response.message));
  });
  created.addEventListener('error', event => {
    event.preventDefault();
    const error = new Error(event.message || 'The export worker failed.');
    for (const call of pending.values()) call.reject(error);
    pending.clear();
    created.terminate();
    worker = null;
  });
  worker = created;
  return created;
}

export function callSheets<M extends SheetsMethod>(
  method: M,
  args: Parameters<SheetsMethods[M]>[0],
  transfer: Transferable[] = [],
): Promise<Awaited<ReturnType<SheetsMethods[M]>>> {
  const id = ++nextId;
  const request: SheetsRequest<M> = { id, method, args };
  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: value => {
        resolve(value as Awaited<ReturnType<SheetsMethods[M]>>);
      },
      reject,
    });
    sheetsWorker().postMessage(request, transfer);
  });
}
