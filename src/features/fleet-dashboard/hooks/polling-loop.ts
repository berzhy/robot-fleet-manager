const pollTimeoutMs = 5_000;
const pollDelayMs = 5_000;

/** Return false to stop scheduling. cancelled() excludes request timeouts. */
export function createPollingLoop(
  poll: (signal: AbortSignal, cancelled: () => boolean) => Promise<boolean>,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let disposed = false;

  function cancel() {
    clearTimeout(timer);
    controller?.abort();
  }

  async function start() {
    if (disposed) return;

    cancel();
    const current = new AbortController();
    controller = current;
    const cancelled = () => disposed || current.signal.aborted;

    const keepPolling = await poll(
      AbortSignal.any([current.signal, AbortSignal.timeout(pollTimeoutMs)]),
      cancelled,
    );

    if (keepPolling && !cancelled())
      timer = setTimeout(() => void start(), pollDelayMs);
  }

  return {
    start,
    cancel,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
