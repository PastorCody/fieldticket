"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AutosaveOptions {
  /** Debounce delay in ms before auto-saving (default: 3000) */
  delayMs?: number;
  /** Disable autosave (e.g. while data is loading) */
  enabled?: boolean;
}

export interface AutosaveState {
  /** True when current state differs from last saved state */
  isDirty: boolean;
  /** Timestamp of the last successful save */
  lastSaved: Date | null;
  /** True while a save is in progress */
  isSaving: boolean;
}

/**
 * Debounced autosave hook. Watches serializable data for changes,
 * waits for a pause in edits, then silently persists.
 *
 * @param data - The state to watch (must be JSON-serializable)
 * @param saveFn - Async function that persists the data. Return true on success.
 * @param options - Configuration
 */
export function useAutosave(
  data: unknown,
  saveFn: () => Promise<boolean>,
  options?: AutosaveOptions
): AutosaveState {
  const delayMs = options?.delayMs ?? 3000;
  const enabled = options?.enabled ?? true;

  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Store the initial snapshot (set once when enabled becomes true)
  const snapshotRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  // Capture initial snapshot once data is loaded
  useEffect(() => {
    if (enabled && snapshotRef.current === null && data !== undefined) {
      snapshotRef.current = JSON.stringify(data);
    }
  }, [enabled, data]);

  // Watch for changes and schedule autosave
  useEffect(() => {
    if (!enabled || snapshotRef.current === null) return;

    const current = JSON.stringify(data);
    const dirty = current !== snapshotRef.current;
    setIsDirty(dirty);

    // Clear any pending save
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Schedule save if dirty and not already saving
    if (dirty && !savingRef.current) {
      timerRef.current = setTimeout(async () => {
        savingRef.current = true;
        setIsSaving(true);
        try {
          const ok = await saveFn();
          if (ok) {
            // Update snapshot to current state
            snapshotRef.current = JSON.stringify(data);
            setIsDirty(false);
            setLastSaved(new Date());
          }
        } catch {
          // Silent failure — user can still manually save
        } finally {
          savingRef.current = false;
          setIsSaving(false);
        }
      }, delayMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, enabled, delayMs, saveFn]);

  // Mark as saved externally (e.g. after a manual save button press)
  const markSaved = useCallback(() => {
    snapshotRef.current = JSON.stringify(data);
    setIsDirty(false);
    setLastSaved(new Date());
  }, [data]);

  // Expose markSaved as a side channel for manual saves
  // We attach it to lastSaved object for simplicity — consumers
  // can call it after their own save succeeds
  return { isDirty, lastSaved, isSaving };
}
