import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Generate a 6-char alphanumeric code
function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export interface ClassroomMember {
  id: string;
  user_id: string;
  name: string;
  prn: string | null;
  is_present: boolean;
  tab_switch_count: number;
  is_tab_active: boolean;
  joined_at: string;
}

export interface QuizWithQuestions {
  id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correct_index: number;
  }[];
}

export interface ClassroomData {
  id: string;
  code: string;
  teacher_id: string;
  is_active: boolean;
  attendance_marked: boolean;
  chat_enabled: boolean;
  notifications_enabled: boolean;
  created_at: string;
  teacher_name: string;
}

export function useClassroomData(classroomId: string | undefined) {
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [quizzes, setQuizzes] = useState<QuizWithQuestions[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!classroomId || !user) return;

    const [classroomRes, membersRes, quizzesRes, filesRes] = await Promise.all([
      supabase.from("classrooms").select("*").eq("id", classroomId).maybeSingle(),
      supabase.from("classroom_members").select("*").eq("classroom_id", classroomId),
      supabase.from("quizzes").select("*").eq("classroom_id", classroomId),
      supabase.from("shared_files").select("*").eq("classroom_id", classroomId),
    ]);

    if (classroomRes.data) {
      // Fetch teacher name
      const profileRes = await supabase.from("profiles").select("name").eq("user_id", classroomRes.data.teacher_id).maybeSingle();
      setClassroom({
        ...classroomRes.data,
        teacher_name: profileRes.data?.name || "Teacher",
      });
    }

    if (membersRes.data) {
      const userIds = membersRes.data.map((m: any) => m.user_id);
      const profilesRes = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

      // Fetch PRNs individually via the security-definer RPC (returns null when not permitted)
      const prnEntries = await Promise.all(
        userIds.map(async (uid: string) => {
          const { data } = await supabase.rpc("get_student_prn", { p_user_id: uid });
          return [uid, (data as string | null) ?? null] as const;
        })
      );
      const prnMap = new Map(prnEntries);

      setMembers(
        membersRes.data.map((m: any) => ({
          ...m,
          name: (profileMap.get(m.user_id) as any)?.name || "Unknown",
          prn: prnMap.get(m.user_id) ?? null,
        }))
      );
    }

    if (quizzesRes.data) {
      const quizIds = quizzesRes.data.map((q: any) => q.id);
      let questions: any[] = [];
      if (quizIds.length > 0) {
        // Try teacher view first (includes correct_index); fall back to public view for students
        const qRes = await supabase.from("quiz_questions").select("*").in("quiz_id", quizIds).order("sort_order");
        if (qRes.data && qRes.data.length > 0) {
          questions = qRes.data;
        } else {
          const qPubRes = await supabase
            .from("quiz_questions_public" as any)
            .select("*")
            .in("quiz_id", quizIds)
            .order("sort_order");
          questions = (qPubRes.data as any[]) || [];
        }
      }

      // Fetch answers for these quizzes
      let answers: any[] = [];
      if (quizIds.length > 0) {
        const questionIds = questions.map((q: any) => q.id);
        if (questionIds.length > 0) {
          const aRes = await supabase.from("quiz_answers").select("*").in("question_id", questionIds);
          answers = aRes.data || [];
        }
      }
      setQuizAnswers(answers);

      setQuizzes(
        quizzesRes.data.map((q: any) => ({
          ...q,
          questions: questions
            .filter((qq: any) => qq.quiz_id === q.id)
            .map((qq: any) => ({
              id: qq.id,
              question: qq.question,
              options: Array.isArray(qq.options) ? qq.options : JSON.parse(qq.options || "[]"),
              correct_index: qq.correct_index ?? -1,
            })),
        }))
      );
    }

    // Generate signed URLs for storage paths
    const rawFiles = filesRes.data || [];
    const filesWithUrls = await Promise.all(
      rawFiles.map(async (f: any) => {
        if (f.url.startsWith("http") || f.url.startsWith("blob:")) {
          return f;
        }
        const { data } = await supabase.storage
          .from("shared-files")
          .createSignedUrl(f.url, 3600);
        return { ...f, storage_path: f.url, url: data?.signedUrl || f.url };
      })
    );
    setSharedFiles(filesWithUrls);
    setLoading(false);
  }, [classroomId, user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time subscriptions
  useEffect(() => {
    if (!classroomId) return;

    const channel = supabase
      .channel(`classroom-${classroomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "classroom_members", filter: `classroom_id=eq.${classroomId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "classrooms", filter: `id=eq.${classroomId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "quizzes", filter: `classroom_id=eq.${classroomId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_questions" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_answers" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_files", filter: `classroom_id=eq.${classroomId}` }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [classroomId, fetchAll]);

  return { classroom, members, quizzes, quizAnswers, sharedFiles, loading, refetch: fetchAll };
}

// ===== ACTIONS =====

export async function createClassroomAction(teacherId: string): Promise<string | null> {
  const code = generateClassCode();
  const { data, error } = await supabase
    .from("classrooms")
    .insert({ teacher_id: teacherId, code })
    .select("id")
    .single();
  if (error) {
    toast.error("Failed to create classroom: " + error.message);
    return null;
  }
  return data.id;
}

export const TAB_SWITCH_LIMIT = 5;
export const ATTENDANCE_MIN_MINUTES = 5;

export async function joinClassroomAction(code: string, userId: string): Promise<string | null> {
  const { data: classroom, error: findErr } = await supabase
    .from("classrooms")
    .select("id, is_active")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (findErr || !classroom) {
    toast.error("Invalid or expired class code");
    return null;
  }

  // Block kicked students from rejoining
  const { data: kick } = await supabase
    .from("classroom_kicks")
    .select("id")
    .eq("classroom_id", classroom.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (kick) {
    toast.error("You were removed from this class for switching tabs too many times and cannot rejoin.");
    return null;
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("classroom_members")
    .select("id")
    .eq("classroom_id", classroom.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return classroom.id;

  const { error } = await supabase
    .from("classroom_members")
    .insert({ classroom_id: classroom.id, user_id: userId });

  if (error) {
    toast.error("Failed to join: " + error.message);
    return null;
  }
  return classroom.id;
}

export async function kickStudentForTabSwitchAction(classroomId: string, userId: string) {
  // Record kick (idempotent due to UNIQUE constraint)
  await supabase
    .from("classroom_kicks")
    .insert({ classroom_id: classroomId, user_id: userId, reason: "tab_switch_limit" });
  // Remove from members
  await supabase
    .from("classroom_members")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("user_id", userId);
}

export async function stopClassroomAction(classroomId: string) {
  await supabase.from("classrooms").update({ is_active: false }).eq("id", classroomId);
}

export async function markAttendanceAction(classroomId: string) {
  // Apply 5-minute rule: only students whose joined_at is at least ATTENDANCE_MIN_MINUTES old are marked Present
  const { data: members } = await supabase
    .from("classroom_members")
    .select("id, joined_at")
    .eq("classroom_id", classroomId);

  const cutoff = Date.now() - ATTENDANCE_MIN_MINUTES * 60 * 1000;
  const presentIds: string[] = [];
  const absentIds: string[] = [];
  (members || []).forEach((m: any) => {
    if (new Date(m.joined_at).getTime() <= cutoff) presentIds.push(m.id);
    else absentIds.push(m.id);
  });

  if (presentIds.length > 0) {
    await supabase.from("classroom_members").update({ is_present: true }).in("id", presentIds);
  }
  if (absentIds.length > 0) {
    await supabase.from("classroom_members").update({ is_present: false }).in("id", absentIds);
  }
  await supabase.from("classrooms").update({ attendance_marked: true }).eq("id", classroomId);
}

export async function togglePresenceAction(classroomId: string, memberId: string, currentPresence: boolean) {
  const newPresence = !currentPresence;
  const { error } = await supabase.from("classroom_members").update({ is_present: newPresence }).eq("id", memberId);
  if (error) toast.error("Failed to update presence: " + error.message);
}

export async function addQuizAction(
  classroomId: string,
  title: string,
  questions: { question: string; options: string[]; correctIndex: number }[]
) {
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({ classroom_id: classroomId, title })
    .select("id")
    .single();
  if (error || !quiz) { toast.error("Failed to create quiz"); return; }

  const questionRows = questions.map((q, i) => ({
    quiz_id: quiz.id,
    question: q.question,
    options: JSON.stringify(q.options),
    correct_index: q.correctIndex,
    sort_order: i,
  }));
  await supabase.from("quiz_questions").insert(questionRows);
}

export async function submitAnswerAction(questionId: string, studentId: string, selectedIndex: number, correctIndex: number) {
  const { error } = await supabase.from("quiz_answers").insert({
    question_id: questionId,
    student_id: studentId,
    selected_index: selectedIndex,
    is_correct: selectedIndex === correctIndex,
  });
  if (error) toast.error("Failed to submit answer: " + error.message);
}

export async function shareFileAction(classroomId: string, name: string, file: File) {
  const filePath = `${classroomId}/${Date.now()}_${name}`;
  const { error: uploadError } = await supabase.storage
    .from("shared-files")
    .upload(filePath, file);
  if (uploadError) {
    toast.error("Failed to upload file: " + uploadError.message);
    return;
  }
  const { error } = await supabase.from("shared_files").insert({
    classroom_id: classroomId,
    name,
    url: filePath,
  });
  if (error) toast.error("Failed to share file: " + error.message);
}

export async function deleteFileAction(fileId: string, storagePath: string) {
  // Delete from storage
  await supabase.storage.from("shared-files").remove([storagePath]);
  // Delete from database
  const { error } = await supabase.from("shared_files").delete().eq("id", fileId);
  if (error) toast.error("Failed to delete file: " + error.message);
}

export async function updateTabStatusAction(classroomId: string, userId: string, isActive: boolean): Promise<{ kicked: boolean }> {
  const update: any = { is_tab_active: isActive };
  let newCount = 0;
  if (!isActive) {
    const { data } = await supabase
      .from("classroom_members")
      .select("tab_switch_count")
      .eq("classroom_id", classroomId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      newCount = data.tab_switch_count + 1;
      update.tab_switch_count = newCount;
    }
  }
  await supabase
    .from("classroom_members")
    .update(update)
    .eq("classroom_id", classroomId)
    .eq("user_id", userId);

  if (!isActive && newCount > TAB_SWITCH_LIMIT) {
    await kickStudentForTabSwitchAction(classroomId, userId);
    return { kicked: true };
  }
  return { kicked: false };
}
