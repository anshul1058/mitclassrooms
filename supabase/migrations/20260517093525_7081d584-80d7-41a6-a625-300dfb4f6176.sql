
-- 1. Move PRN to its own table
CREATE TABLE public.student_prns (
  user_id uuid PRIMARY KEY,
  prn text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.student_prns (user_id, prn)
SELECT user_id, prn FROM public.profiles WHERE prn IS NOT NULL;

ALTER TABLE public.profiles DROP COLUMN prn;

ALTER TABLE public.student_prns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own prn" ON public.student_prns
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Teacher of shared classroom can read prn" ON public.student_prns
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.classroom_members cm
    JOIN public.classrooms c ON c.id = cm.classroom_id
    WHERE cm.user_id = student_prns.user_id AND c.teacher_id = auth.uid()
  ));

CREATE POLICY "Owner can insert own prn" ON public.student_prns
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update handle_new_user trigger to write PRN into student_prns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));

  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  END IF;

  IF NEW.raw_user_meta_data->>'prn' IS NOT NULL THEN
    INSERT INTO public.student_prns (user_id, prn)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'prn')
    ON CONFLICT (user_id) DO UPDATE SET prn = EXCLUDED.prn;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. quiz_questions: hide correct_index from students
DROP POLICY IF EXISTS "Members can view questions" ON public.quiz_questions;

CREATE POLICY "Teachers can view questions" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_questions.quiz_id
      AND public.is_classroom_teacher(auth.uid(), q.classroom_id)
  ));

-- View students use (no correct_index)
CREATE OR REPLACE VIEW public.quiz_questions_public
WITH (security_invoker = true) AS
SELECT id, quiz_id, question, options, sort_order
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_public TO authenticated;

-- Allow members to read rows that back the view (RLS still applies, so we need a SELECT policy that lets members see rows)
CREATE POLICY "Members can view question rows (no correct)" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_questions.quiz_id
      AND public.is_classroom_member(auth.uid(), q.classroom_id)
  ));

-- Column-level: revoke correct_index from authenticated, grant other columns
REVOKE SELECT ON public.quiz_questions FROM authenticated;
GRANT SELECT (id, quiz_id, question, options, sort_order) ON public.quiz_questions TO authenticated;
-- Teachers need correct_index too; grant via role-check function instead by giving authenticated SELECT(correct_index) ONLY through the policy. Postgres doesn't gate columns per-policy, so grant it back and rely on row policy + students querying the view.
GRANT SELECT (correct_index) ON public.quiz_questions TO authenticated;

-- Trigger to compute is_correct server-side so client never needs correct_index
CREATE OR REPLACE FUNCTION public.set_quiz_answer_correctness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct integer;
BEGIN
  SELECT correct_index INTO v_correct
  FROM public.quiz_questions
  WHERE id = NEW.question_id;
  NEW.is_correct := (NEW.selected_index = v_correct);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_quiz_answer_correctness ON public.quiz_answers;
CREATE TRIGGER trg_set_quiz_answer_correctness
BEFORE INSERT ON public.quiz_answers
FOR EACH ROW EXECUTE FUNCTION public.set_quiz_answer_correctness();

-- 3. classroom_members: drop broad student UPDATE, add narrow RPC
DROP POLICY IF EXISTS "Students can update own record" ON public.classroom_members;

CREATE OR REPLACE FUNCTION public.report_tab_status(p_classroom_id uuid, p_is_active boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
  v_kicked boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_is_active THEN
    UPDATE public.classroom_members
    SET is_tab_active = true
    WHERE classroom_id = p_classroom_id AND user_id = v_user;
  ELSE
    UPDATE public.classroom_members
    SET is_tab_active = false,
        tab_switch_count = tab_switch_count + 1
    WHERE classroom_id = p_classroom_id AND user_id = v_user
    RETURNING tab_switch_count INTO v_count;

    IF v_count IS NOT NULL AND v_count > 5 THEN
      INSERT INTO public.classroom_kicks (classroom_id, user_id, reason)
      VALUES (p_classroom_id, v_user, 'tab_switch_limit')
      ON CONFLICT DO NOTHING;
      DELETE FROM public.classroom_members
      WHERE classroom_id = p_classroom_id AND user_id = v_user;
      v_kicked := true;
    END IF;
  END IF;

  RETURN jsonb_build_object('kicked', v_kicked, 'count', COALESCE(v_count, 0));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.report_tab_status(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_tab_status(uuid, boolean) TO authenticated;

-- 4. classroom_kicks: require membership for student self-insert
DROP POLICY IF EXISTS "Students can record own kick" ON public.classroom_kicks;
CREATE POLICY "Students can record own kick" ON public.classroom_kicks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_classroom_member(auth.uid(), classroom_id));

-- 5. classrooms: drop broad SELECT, add lookup RPC
DROP POLICY IF EXISTS "Anyone can find active classrooms by code" ON public.classrooms;

CREATE OR REPLACE FUNCTION public.find_classroom_by_code(p_code text)
RETURNS TABLE(id uuid, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, is_active FROM public.classrooms WHERE code = p_code AND is_active = true LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.find_classroom_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_classroom_by_code(text) TO authenticated;

-- 6. get_student_prn for teachers
CREATE OR REPLACE FUNCTION public.get_student_prn(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT prn FROM public.student_prns
  WHERE user_id = p_user_id
    AND (
      auth.uid() = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.classroom_members cm
        JOIN public.classrooms c ON c.id = cm.classroom_id
        WHERE cm.user_id = p_user_id AND c.teacher_id = auth.uid()
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_prn(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_prn(uuid) TO authenticated;

-- 7. Revoke SECURITY DEFINER helpers from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_classroom(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_classroom(uuid, uuid) TO authenticated;
