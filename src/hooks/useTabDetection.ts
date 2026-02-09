import { useEffect } from "react";
import { updateTabStatusAction } from "@/hooks/useClassroomData";

export function useTabDetection(classroomId: string | null, userId: string | null, isClassActive: boolean) {
  useEffect(() => {
    if (!classroomId || !userId || !isClassActive) return;

    const handleVisibility = () => {
      updateTabStatusAction(classroomId, userId, !document.hidden);
    };

    const handleBlur = () => updateTabStatusAction(classroomId, userId, false);
    const handleFocus = () => updateTabStatusAction(classroomId, userId, true);

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
