DROP POLICY IF EXISTS "Students can join classrooms" ON public.classroom_members;
CREATE POLICY "Students can join classrooms"
ON public.classroom_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND has_role(auth.uid(), 'student'::app_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.classroom_kicks ck
    WHERE ck.classroom_id = classroom_members.classroom_id
      AND ck.user_id = auth.uid()
  )
);