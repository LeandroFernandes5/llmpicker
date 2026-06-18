import type { ProviderError, ProviderId } from './types';

export function providerError(
  providerId: ProviderId,
  message: string,
  status?: number,
): ProviderError {
  const err = new Error(message) as ProviderError;
  err.providerId = providerId;
  err.status = status;
  err.name = 'ProviderError';
  return err;
}

export type StreamSseOptions = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignal;
};

export type StreamSseResult = {
  status: number;
  body: string;
};

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function abortError(): Error {
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

export function streamSseRequest(
  options: StreamSseOptions,
  onData: (data: string) => void,
): Promise<StreamSseResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, options.url);
    for (const [k, v] of Object.entries(options.headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.responseType = 'text';

    let processed = 0;
    let buffer = '';
    let eventsParsed = 0;
    let lastProgressLength = 0;

    const drainNew = () => {
      const full = xhr.responseText ?? '';
      if (full.length <= processed) return;
      buffer += full.substring(processed);
      processed = full.length;
      const parts = buffer.split(/\r\n\r\n|\r\r|\n\n/);
      buffer = parts.pop() ?? '';
      for (const rawEvent of parts) {
        const data = rawEvent
          .split(/\r\n|\r|\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.substring(5).replace(/^ /, ''))
          .join('\n');
        if (data.length > 0) {
          eventsParsed++;
          onData(data);
        }
      }
    };

    xhr.onreadystatechange = () => {
      if (__DEV__ && xhr.readyState === 2) {
        console.log('[stream] headers received, status:', xhr.status);
      }
      if (xhr.readyState === 3) {
        const len = (xhr.responseText ?? '').length;
        if (__DEV__ && len !== lastProgressLength) {
          console.log('[stream] LOADING, responseText length so far:', len);
          lastProgressLength = len;
        }
        drainNew();
      }
    };
    xhr.onload = () => {
      drainNew();
      if (__DEV__) {
        console.log(
          '[stream] DONE — status:',
          xhr.status,
          '| body length:',
          (xhr.responseText ?? '').length,
          '| events parsed:',
          eventsParsed,
        );
        const body = xhr.responseText ?? '';
        if (eventsParsed === 0 && body.length > 0) {
          console.log('[stream] body sample (first 500 chars):', body.substring(0, 500));
        }
      }
      resolve({ status: xhr.status, body: xhr.responseText ?? '' });
    };
    xhr.onerror = (e) => {
      if (__DEV__) console.log('[stream] onerror', e);
      reject(new Error('Network request failed'));
    };
    xhr.ontimeout = () => {
      if (__DEV__) console.log('[stream] ontimeout');
      reject(new Error('Request timed out'));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        reject(abortError());
        return;
      }
      options.signal.addEventListener('abort', () => {
        xhr.abort();
        reject(abortError());
      });
    }

    xhr.send(options.body);
  });
}
