import { useEffect, useRef } from "react";

/**
 * Requests browser Notification permission when `enabled` is true and fires
 * a system notification whenever `triggerKey` changes (e.g. a tab-switch event).
 *
 * Note: web apps cannot block notifications from OTHER apps. This only adds
 * our own OS-level alerts so students see distraction warnings even when the
 * tab is in the background.
 */
export function useBrowserNotifications(enabled: boolean) {
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (requestedRef.current) return;
    if (Notification.permission === "default") {
      requestedRef.current = true;
      Notification.requestPermission().catch(() => {});
    }
  }, [enabled]);
}

/** Fire a single OS notification if the user has granted permission. */
export function fireBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "classpulse-distraction",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // ignore
  }
}
