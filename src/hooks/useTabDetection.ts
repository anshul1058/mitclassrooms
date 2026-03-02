import { useEffect, useRef, useCallback } from "react";
import { updateTabStatusAction } from "@/hooks/useClassroomData";

let globalPauseUntil = 0;

/** Call this before opening a link in a new tab to suppress the next tab-switch detection */
export function pauseTabDetection(ms = 3000) {
  globalPauseUntil = Date.now() + ms;
}

export function useTabDetection(classroomId: string | null, userId: string | null, isClassActive: boolean) {
  useEffect(() => {
    if (!classroomId || !userId || !isClassActive) return;

    const isPaused = () => Date.now() < globalPauseUntil;

    const handleVisibility = () => {
      if (isPaused()) return;
      updateTabStatusAction(classroomId, userId, !document.hidden);
    };

    const handleBlur = () => { if (!isPaused()) updateTabStatusAction(classroomId, userId, false); };
    const handleFocus = () => { if (!isPaused()) updateTabStatusAction(classroomId, userId, true); };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [classroomId, userId, isClassActive]);
}
