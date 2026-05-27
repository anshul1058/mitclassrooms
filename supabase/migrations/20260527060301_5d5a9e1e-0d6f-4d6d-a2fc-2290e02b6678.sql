
-- 1) Harden handle_new_user: never trust client-supplied role; default to student
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));

  -- Always default new users to 'student'. Teacher role must be granted by an admin.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role)
  ON CONFLICT DO NOTHING;

  IF NEW.raw_user_meta_data->>'prn' IS NOT NULL THEN
    INSERT INTO public.student_prns (user_id, prn)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'prn')
    ON CONFLICT (user_id) DO UPDATE SET prn = EXCLUDED.prn;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Revoke anon/public EXECUTE on SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_classroom(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_quiz_answer_correctness() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_quiz_questions_for_teacher(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_student_prn(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_classroom_by_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_tab_status(uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_classroom_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_teacher(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_classroom(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_prn(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_classroom_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_tab_status(uuid, boolean) TO authenticated;
