const callbacks: (() => void)[] = [];

/**
 * Some resources hold a list that every service adds to (the users of a database,
 * for instance). They register a callback here to be created after all services
 * were deployed and had the chance to add themselves to those lists.
 */
export function onFinalize(callback: () => void) {
  callbacks.push(callback);
}

/** Runs the callbacks. Called once, at the end of `index.ts`. */
export function finalize() {
  // Callbacks may register more callbacks
  for (let callback = callbacks.shift(); callback; callback = callbacks.shift())
    callback();
}
