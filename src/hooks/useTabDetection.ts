import { useEffect } from "react";
import { updateStudentTab } from "@/lib/store";

export function useTabDetection(classroomId: string | null, studentId: string | null, isClassActive: boolean) {
  useEffect(() => {
    if (!classroomId || !studentId || !isClassActive) return;

    const handleVisibility = () => {
      const isActive = !document.hidden;
      updateStudentTab(classroomId, studentId, isActive);
    };

    const handleBlur = () => updateStudentTab(classroomId, studentId, false);
    const handleFocus = () => updateStudentTab(classroomId, studentId, true);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [classroomId, studentId, isClassActive]);
}
