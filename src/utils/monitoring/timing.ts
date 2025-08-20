import { metrics } from './metrics.js';

/**
 * Decorator to time function execution
 */
export function timed(operationName?: string) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    const operation = operationName || `${(target as { constructor: { name: string } }).constructor.name}.${propertyKey}`;

    descriptor.value = (async function (this: unknown, ...args: unknown[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;
        metrics.recordTiming(operation, duration);
        metrics.incrementCounter(`${operation}.success`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        metrics.recordTiming(operation, duration);
        metrics.incrementCounter(`${operation}.error`);
        throw error;
      }
    }) as T;

    return descriptor;
  };
}

/**
 * Time an async operation
 */
export async function timeOperation<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    metrics.recordTiming(operationName, duration);
    metrics.incrementCounter(`${operationName}.success`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.recordTiming(operationName, duration);
    metrics.incrementCounter(`${operationName}.error`);
    throw error;
  }
}