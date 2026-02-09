
-- Role enum
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

-- User roles table (per security requirements - roles MUST be separate)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prn TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Classrooms table
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  attendance_marked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Classroom members (students who joined)
CREATE TABLE public.classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT true,
  tab_switch_count INT NOT NULL DEFAULT 0,
  is_tab_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, user_id)
);
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_index INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Quiz answers
CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  selected_index INT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, student_id)
);
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Shared files
CREATE TABLE public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

-- ===== SECURITY DEFINER HELPER FUNCTIONS =====

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Check if user is a member of a classroom (student)
CREATE OR REPLACE FUNCTION public.is_classroom_member(_user_id UUID, _classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.classroom_members WHERE user_id = _user_id AND classroom_id = _classroom_id)
$$;

-- Check if user is the teacher (owner) of a classroom
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(_user_id UUID, _classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.classrooms WHERE id = _classroom_id AND teacher_id = _user_id)
$$;

-- Check if user can access classroom (either teacher or member)
CREATE OR REPLACE FUNCTION public.can_access_classroom(_user_id UUID, _classroom_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_classroom_teacher(_user_id, _classroom_id) OR public.is_classroom_member(_user_id, _classroom_id)
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  -- Insert role if provided in metadata
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  END IF;
  
  -- Insert PRN if provided
  IF NEW.raw_user_meta_data->>'prn' IS NOT NULL THEN
    UPDATE public.profiles SET prn = NEW.raw_user_meta_data->>'prn' WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS POLICIES =====

-- user_roles: users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- profiles
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- classrooms
CREATE POLICY "Teachers can create classrooms" ON public.classrooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Members can view classrooms" ON public.classrooms FOR SELECT TO authenticated
  USING (public.can_access_classroom(auth.uid(), id));
CREATE POLICY "Teachers can update own classrooms" ON public.classrooms FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own classrooms" ON public.classrooms FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id);

-- classroom_members
CREATE POLICY "Members can view classroom members" ON public.classroom_members FOR SELECT TO authenticated
  USING (public.can_access_classroom(auth.uid(), classroom_id));
CREATE POLICY "Students can join classrooms" ON public.classroom_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'student'));
CREATE POLICY "Teachers can update members" ON public.classroom_members FOR UPDATE TO authenticated
  USING (public.is_classroom_teacher(auth.uid(), classroom_id));
CREATE POLICY "Members can leave" ON public.classroom_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_classroom_teacher(auth.uid(), classroom_id));

-- quizzes
CREATE POLICY "Members can view quizzes" ON public.quizzes FOR SELECT TO authenticated
  USING (public.can_access_classroom(auth.uid(), classroom_id));
CREATE POLICY "Teachers can create quizzes" ON public.quizzes FOR INSERT TO authenticated
  WITH CHECK (public.is_classroom_teacher(auth.uid(), classroom_id));
CREATE POLICY "Teachers can update quizzes" ON public.quizzes FOR UPDATE TO authenticated
  USING (public.is_classroom_teacher(auth.uid(), classroom_id));
CREATE POLICY "Teachers can delete quizzes" ON public.quizzes FOR DELETE TO authenticated
  USING (public.is_classroom_teacher(auth.uid(), classroom_id));

-- quiz_questions (need to join through quizzes to get classroom_id)
CREATE POLICY "Members can view questions" ON public.quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND public.can_access_classroom(auth.uid(), q.classroom_id)));
CREATE POLICY "Teachers can create questions" ON public.quiz_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND public.is_classroom_teacher(auth.uid(), q.classroom_id)));
CREATE POLICY "Teachers can update questions" ON public.quiz_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND public.is_classroom_teacher(auth.uid(), q.classroom_id)));
CREATE POLICY "Teachers can delete questions" ON public.quiz_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND public.is_classroom_teacher(auth.uid(), q.classroom_id)));

-- quiz_answers
CREATE POLICY "Students can submit answers" ON public.quiz_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND EXISTS (
    SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = question_id AND public.is_classroom_member(auth.uid(), q.classroom_id)
  ));
CREATE POLICY "View own answers or teacher views all" ON public.quiz_answers FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR EXISTS (
    SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = question_id AND public.is_classroom_teacher(auth.uid(), q.classroom_id)
  ));

-- shared_files
CREATE POLICY "Members can view files" ON public.shared_files FOR SELECT TO authenticated
  USING (public.can_access_classroom(auth.uid(), classroom_id));
CREATE POLICY "Teachers can share files" ON public.shared_files FOR INSERT TO authenticated
  WITH CHECK (public.is_classroom_teacher(auth.uid(), classroom_id));
CREATE POLICY "Teachers can delete files" ON public.shared_files FOR DELETE TO authenticated
  USING (public.is_classroom_teacher(auth.uid(), classroom_id));

-- ===== REALTIME =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms;
