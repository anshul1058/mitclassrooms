
CREATE TABLE public.classroom_kicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL DEFAULT 'tab_switch_limit',
  kicked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, user_id)
);

ALTER TABLE public.classroom_kicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view kicks"
  ON public.classroom_kicks FOR SELECT
  TO authenticated
  USING (can_access_classroom(auth.uid(), classroom_id) OR auth.uid() = user_id);

CREATE POLICY "Students can record own kick"
  ON public.classroom_kicks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can record kicks"
  ON public.classroom_kicks FOR INSERT
  TO authenticated
  WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id));

CREATE POLICY "Teachers can clear kicks"
  ON public.classroom_kicks FOR DELETE
  TO authenticated
  USING (is_classroom_teacher(auth.uid(), classroom_id));
