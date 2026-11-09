import 'server-only';

// Skeleton for the RED commit: the loggers write nothing and redactUrl changes nothing.
type Sink = { write(chunk: string): void };

type SkeletonLogger = {
  level: string;
  info(...args: unknown[]): void;
  child(bindings: Record<string, unknown>): SkeletonLogger;
};

export function createLogger(options?: {
  level?: string;
  destination?: Sink;
}): SkeletonLogger {
  void options;
  return {
    level: '',
    info() {},
    child() {
      return createLogger();
    },
  };
}

export function getLogger(): SkeletonLogger {
  return createLogger();
}

export function requestLogger(
  requestId: string,
  base: SkeletonLogger = getLogger(),
): SkeletonLogger {
  void requestId;
  return base;
}

export function redactUrl(url: string): string {
  return url;
}
