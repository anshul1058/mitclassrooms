
-- 1. Revoke correct_index column access from students
REVOKE SELECT (correct_index) ON public.quiz_questions FROM authenticated;
REVOKE SELECT (correct_index) ON public.quiz_questions FROM anon;

-- Teacher RPC to fetch questions with correct_index
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_teacher(p_quiz_id uuid)
RETURNS TABLE(id uuid, quiz_id uuid, question text, options jsonb, correct_index integer, sort_order integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qq.id, qq.quiz_id, qq.question, qq.options, qq.correct_index, qq.sort_order
  FROM public.quiz_questions qq
  JOIN public.quizzes q ON q.id = qq.quiz_id
  WHERE qq.quiz_id = p_quiz_id
    AND public.is_classroom_teacher(auth.uid(), q.classroom_id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_quiz_questions_for_teacher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_teacher(uuid) TO authenticated;

-- 2. Remove student self-insert on classroom_kicks
DROP POLICY IF EXISTS "Students can record own kick" ON public.classroom_kicks;

-- Update report_tab_status to insert kick as SECURITY DEFINER (already is)
-- (already inserts kick server-side; no change needed)

-- 3. Add teacher role check to classrooms update/delete
DROP POLICY IF EXISTS "Teachers can update own classrooms" ON public.classrooms;
CREATE POLICY "Teachers can update own classrooms"
ON public.classrooms FOR UPDATE TO authenticated
USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

DROP POLICY IF EXISTS "Teachers can delete own classrooms" ON public.classrooms;
CREATE POLICY "Teachers can delete own classrooms"
ON public.classrooms FOR DELETE TO authenticated
USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

-- 4. Revoke SECURITY DEFINER function execution from anon
REVOKE EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_classroom(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_classroom_by_code(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_prn(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.report_tab_status(uuid, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_quiz_answer_correctness() FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_classroom(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_classroom_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_prn(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_tab_status(uuid, boolean) TO authenticated;
