import { useEffect, useRef } from "react";

/**
 * Keeps the device screen awake while this hook is mounted (and `enabled` is true).
 * Uses the Screen Wake Lock API. Re-acquires automatically when the tab becomes visible again.
 * No-op on browsers that don't support it.
 */
export function useWakeLock(enabled: boolean = true) {
  const sentinelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        // @ts-ignore - wakeLock is not yet in all TS lib targets
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener?.("release", () => {
          sentinelRef.current = null;
        });
      } catch {
        // Permission denied, low battery, etc. — silently ignore
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) s.release().catch(() => {});
    };
  }, [enabled]);
}
