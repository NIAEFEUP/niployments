/**
 * Memoizes a factory, so that a service can be deployed on first use
 * (either by `index.ts` or by another service that depends on it).
 */
export function lazy<T>(factory: () => T): () => T {
  let value: { current: T } | undefined;

  return () => {
    value ??= { current: factory() };
    return value.current;
  };
}
