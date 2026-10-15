export interface ExportProgress { stage: string; completed: number; total: number }
export interface ExportTask { signal?: AbortSignal; onProgress?: (progress: ExportProgress) => void }

export function waitForExport<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted()
  if (!signal) return promise
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(signal.reason) }
    const cleanup = () => signal.removeEventListener('abort', abort)
    signal.addEventListener('abort', abort, { once: true })
    promise.then(value => { cleanup(); resolve(value) }, error => { cleanup(); reject(error) })
  })
}

export async function exportCheckpoint(task: ExportTask) {
  await waitForExport(new Promise<void>(resolve => setTimeout(resolve, 0)), task.signal)
  task.signal?.throwIfAborted()
}
