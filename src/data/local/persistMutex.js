/**
 * Mutex for local IndexedDB persist operations.
 * Prevents cloud sync from overwriting in-flight saves (race on outbox).
 */

let lockCount = 0;
/** @type {Array<() => void>} */
const waitQueue = [];

export function isPersistLocked() {
  return lockCount > 0;
}

export function acquirePersistLock() {
  lockCount += 1;
}

export function releasePersistLock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const batch = waitQueue.splice(0);
    for (const resolve of batch) resolve();
  }
}

/**
 * Resolves when no persist operation holds the lock.
 * @param {number} [timeoutMs]
 */
export function waitForPersistIdle(timeoutMs = 30000) {
  if (lockCount === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = waitQueue.indexOf(onIdle);
      if (idx >= 0) waitQueue.splice(idx, 1);
      reject(new Error("persist_idle_timeout"));
    }, timeoutMs);
    const onIdle = () => {
      clearTimeout(timer);
      resolve();
    };
    waitQueue.push(onIdle);
  });
}

/** @template T @param {() => Promise<T>|T} fn */
export async function withPersistLock(fn) {
  acquirePersistLock();
  try {
    return await fn();
  } finally {
    releasePersistLock();
  }
}
