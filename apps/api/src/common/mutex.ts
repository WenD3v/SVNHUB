let locked = false;
const queue: Array<() => void> = [];

export async function withMutex<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

function acquire(): Promise<void> {
  if (!locked) {
    locked = true;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push(resolve);
  });
}

function release(): void {
  const next = queue.shift();
  if (next) {
    next();
  } else {
    locked = false;
  }
}
