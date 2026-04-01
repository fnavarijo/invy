import { useReducer, useRef, useCallback, useEffect } from 'react';
import {
  getBatch,
  type BatchCreateResponse,
  type BatchDetailResponse,
} from '@/lib/api/batches';
import { ApiError } from '@/lib/api/helpers';
import { useAuth } from '@clerk/nextjs';

// ---------------------------------------------------------------------------
// State machine types
// ---------------------------------------------------------------------------

export type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'polling'; batch: BatchCreateResponse; attempt: number }
  | { phase: 'done'; batch: BatchDetailResponse }
  | { phase: 'failed'; error: string; batch?: BatchDetailResponse };

type Action =
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_PROGRESS'; progress: number }
  | { type: 'UPLOAD_DONE'; batch: BatchCreateResponse }
  | { type: 'POLL_TICK'; attempt: number; currentBatch: BatchCreateResponse }
  | { type: 'POLL_DONE'; batch: BatchDetailResponse }
  | { type: 'FAIL'; error: string; batch?: BatchDetailResponse }
  | { type: 'RESET' };

function reducer(state: UploadState, action: Action): UploadState {
  switch (action.type) {
    case 'UPLOAD_START':
      return { phase: 'uploading', progress: 0 };
    case 'UPLOAD_PROGRESS':
      return { phase: 'uploading', progress: action.progress };
    case 'UPLOAD_DONE':
      return { phase: 'polling', batch: action.batch, attempt: 0 };
    case 'POLL_TICK':
      if (state.phase !== 'polling') return state;
      return {
        phase: 'polling',
        batch: action.currentBatch,
        attempt: action.attempt,
      };
    case 'POLL_DONE':
      return { phase: 'done', batch: action.batch };
    case 'FAIL':
      return { phase: 'failed', error: action.error, batch: action.batch };
    case 'RESET':
      return { phase: 'idle' };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Use 2-second interval for the first FAST_ATTEMPTS attempts (~30 s) */
const FAST_ATTEMPTS = 15;
const FAST_INTERVAL_MS = 2_000;
const SLOW_INTERVAL_MS = 10_000;
const MAX_NETWORK_RETRIES = 3;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBatchUpload(options?: { onComplete?: () => void }): {
  state: UploadState;
  upload: (file: File, source?: string) => void;
  reset: () => void;
} {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });

  // Refs for cleanup — stable across renders
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const networkRetryCountRef = useRef(0);
  // Guards async dispatch calls after unmount
  const mountedRef = useRef(true);
  const onCompleteRef = useRef(options?.onComplete);
  const { getToken } = useAuth();

  // Keep ref in sync with latest callback without re-running effects
  useEffect(() => {
    onCompleteRef.current = options?.onComplete;
  });

  // ------------------------------------------------------------------
  // Cleanup helpers — stable references via useCallback
  // ------------------------------------------------------------------

  const cancelPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const abortInFlight = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Unmount cleanup — cancels any in-flight XHR or poll timer
  // ------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelPoll();
      abortInFlight();
    };
  }, [cancelPoll, abortInFlight]);

  // ------------------------------------------------------------------
  // Polling loop (recursive setTimeout — waits for each response before
  // scheduling the next tick to prevent overlapping in-flight requests)
  // ------------------------------------------------------------------

  const schedulePoll = useCallback(
    (batchId: string, currentBatch: BatchCreateResponse, attempt: number) => {
      cancelPoll();
      const delay =
        attempt < FAST_ATTEMPTS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;

      pollTimerRef.current = setTimeout(async () => {
        // Create a fresh AbortController per tick; abort the previous one first
        abortInFlight();
        const ac = new AbortController();
        abortControllerRef.current = ac;

        try {
          const detail = await getBatch(batchId, ac.signal);

          if (!mountedRef.current) return;

          if (detail.status === 'done') {
            dispatch({ type: 'POLL_DONE', batch: detail });
            onCompleteRef.current?.();
            return;
          }

          if (detail.status === 'failed') {
            dispatch({
              type: 'FAIL',
              error:
                detail.errors.length > 0
                  ? detail.errors.map((e) => e.reason).join('; ')
                  : 'Batch processing failed.',
              batch: detail,
            });
            onCompleteRef.current?.();
            return;
          }

          // Still queued/processing — schedule next tick
          const nextAttempt = attempt + 1;
          dispatch({ type: 'POLL_TICK', attempt: nextAttempt, currentBatch });
          schedulePoll(batchId, currentBatch, nextAttempt);
        } catch (err) {
          if (!mountedRef.current) return;

          if (err instanceof Error && err.name === 'AbortError') {
            // Intentionally cancelled — do not change state
            return;
          }

          networkRetryCountRef.current += 1;
          if (networkRetryCountRef.current >= MAX_NETWORK_RETRIES) {
            dispatch({
              type: 'FAIL',
              error:
                err instanceof ApiError
                  ? err.message
                  : 'Network error while polling batch status.',
            });
            return;
          }

          // Retry the same attempt on transient network errors
          schedulePoll(batchId, currentBatch, attempt);
        }
      }, delay);
    },
    [cancelPoll, abortInFlight],
  );

  // ------------------------------------------------------------------
  // Upload via XHR — required for upload.onprogress byte-level events.
  // The Fetch API does not support upload progress in shipping browsers.
  //
  // TODO: Replace window.__INVY_TOKEN__ with a Next.js Route Handler
  // proxy so the Bearer token never reaches the client bundle.
  // ------------------------------------------------------------------

  const upload = useCallback(
    async (file: File, source?: string) => {
      cancelPoll();
      abortInFlight();
      networkRetryCountRef.current = 0;

      dispatch({ type: 'UPLOAD_START' });

      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
      const form = new FormData();
      form.append('file', file);
      if (source) form.append('source', source);

      const xhr = new XMLHttpRequest();

      // Wire XHR abort through the shared AbortController so reset() cancels it
      const ac = new AbortController();
      abortControllerRef.current = ac;
      ac.signal.addEventListener('abort', () => xhr.abort(), { once: true });

      xhr.open('POST', `${apiBase}/v1/batches`);

      const token = await getToken();

      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable && mountedRef.current) {
          dispatch({
            type: 'UPLOAD_PROGRESS',
            progress: Math.round((event.loaded / event.total) * 100),
          });
        }
      };

      xhr.onload = () => {
        if (!mountedRef.current) return;

        if (xhr.status === 202 || xhr.status === 200) {
          try {
            const batch = JSON.parse(xhr.responseText) as BatchCreateResponse;
            dispatch({ type: 'UPLOAD_DONE', batch });
            schedulePoll(batch.batch_id, batch, 0);
          } catch {
            dispatch({ type: 'FAIL', error: 'Invalid response from server.' });
          }
        } else {
          let message = `Upload failed with status ${xhr.status}`;
          try {
            const body = JSON.parse(xhr.responseText) as {
              error?: { code?: string; message?: string };
            };
            if (body.error?.message) message = body.error.message;
          } catch {
            // non-JSON body — keep default message
          }
          dispatch({ type: 'FAIL', error: message });
        }
      };

      xhr.onerror = () => {
        if (mountedRef.current) {
          dispatch({ type: 'FAIL', error: 'Network error during upload.' });
        }
      };

      xhr.send(form);
    },
    [cancelPoll, abortInFlight, schedulePoll],
  );

  // ------------------------------------------------------------------
  // Reset — cancel all in-flight work and return to idle
  // ------------------------------------------------------------------

  const reset = useCallback(() => {
    cancelPoll();
    abortInFlight();
    networkRetryCountRef.current = 0;
    dispatch({ type: 'RESET' });
  }, [cancelPoll, abortInFlight]);

  return { state, upload, reset };
}
