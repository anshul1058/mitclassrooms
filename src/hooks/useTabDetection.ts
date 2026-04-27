import { useEffect, useRef } from "react";
import { updateTabStatusAction } from "@/hooks/useClassroomData";

let globalPauseUntil = 0;

/** Call this before opening a link in a new tab to suppress the next tab-switch detection */
export function pauseTabDetection(ms = 3000) {
  globalPauseUntil = Date.now() + ms;
}

export function useTabDetection(
  classroomId: string | null,
  userId: string | null,
  isClassActive: boolean,
  onKicked?: () => void,
) {
  const lastActiveRef = useRef<boolean>(true);
  const lastReportAtRef = useRef<number>(0);

  useEffect(() => {
    if (!classroomId || !userId || !isClassActive) return;

    const isPaused = () => Date.now() < globalPauseUntil;

    const report = async (active: boolean) => {
      if (isPaused()) return;
      // Dedupe: ignore if state didn't change, or if a duplicate event fires
      // within a short window (visibilitychange + blur often fire together).
      const now = Date.now();
      if (active === lastActiveRef.current) return;
      if (now - lastReportAtRef.current < 800) {
        lastActiveRef.current = active;
        return;
      }
      lastActiveRef.current = active;
      lastReportAtRef.current = now;
      const res = await updateTabStatusAction(classroomId, userId, active);
      if (res.kicked && onKicked) onKicked();
    };

    const handleVisibility = () => report(!document.hidden);
    const handleBlur = () => report(false);
    const handleFocus = () => report(true);

    // Initialize with current state to avoid spurious initial reports
    lastActiveRef.current = !document.hidden;

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [classroomId, userId, isClassActive, onKicked]);
}
