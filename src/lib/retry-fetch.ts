/**
 * Resilient fetch with exponential backoff + jitter.
 *
 * Retries on transient server errors (5xx) and rate limits (429).
 * Respects the Retry-After header when present.
 * Never retries client errors (4xx except 408/429).
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: number[];
  onRetry?: (attempt: number, status: number, delay: number) => void;
}

const DEFAULT_RETRY_ON = [408, 429, 500, 502, 503, 504];

function jitter(base: number): number {
  return base + Math.random() * 500;
}

function getDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  retryAfterHeader: string | null
): number {
  // Respect Retry-After header (seconds) if present
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) {
      return Math.min(seconds * 1000 + Math.random() * 500, maxDelayMs);
    }
  }
  // Exponential backoff with jitter
  return Math.min(jitter(baseDelayMs * Math.pow(2, attempt)), maxDelayMs);
}

/**
 * Fetch with automatic retry on transient failures.
 *
 * For endpoints that use FormData/Blob bodies (e.g. Whisper),
 * pass a `bodyFactory` in the init so the body can be rebuilt on retry.
 */
export async function retryFetch(
  url: string,
  init: RequestInit & { bodyFactory?: () => BodyInit },
  options?: RetryOptions
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 10000;
  const retryOn = options?.retryOn ?? DEFAULT_RETRY_ON;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Rebuild body from factory if provided (handles consumed streams)
      const requestInit: RequestInit = { ...init };
      if (init.bodyFactory && attempt > 0) {
        requestInit.body = init.bodyFactory();
      }

      const response = await fetch(url, requestInit);

      // Success — return immediately
      if (response.ok) {
        return response;
      }

      // Non-retryable status — return the error response
      if (!retryOn.includes(response.status)) {
        return response;
      }

      // Retryable status but out of attempts — return the error response
      if (attempt === maxRetries) {
        return response;
      }

      // Calculate delay and wait
      const retryAfter = response.headers.get("retry-after");
      const delay = getDelay(attempt, baseDelayMs, maxDelayMs, retryAfter);

      options?.onRetry?.(attempt + 1, response.status, delay);

      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      // Network errors (TypeError: Failed to fetch, etc.)
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = getDelay(attempt, baseDelayMs, maxDelayMs, null);
      options?.onRetry?.(attempt + 1, 0, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("retryFetch: unexpected state");
}
