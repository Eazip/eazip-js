/**
 * Maps items with at most `limit` workers in flight, returning one promise
 * per item in input order so a sequential consumer can read results while
 * later items are still being produced.
 */
export function mapOrdered<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R>[] {
  let active = 0;
  const queue: (() => void)[] = [];

  const acquire = (): Promise<void> =>
    new Promise((resolve) => {
      if (active < limit) {
        active += 1;
        resolve();
      } else {
        queue.push(() => {
          active += 1;
          resolve();
        });
      }
    });

  const release = (): void => {
    active -= 1;
    queue.shift()?.();
  };

  return items.map(async (item, index) => {
    await acquire();
    try {
      return await worker(item, index);
    } finally {
      release();
    }
  });
}
