
-- Drop all restrictive policies and recreate as permissive

-- classrooms
DROP POLICY IF EXISTS "Teachers can create classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Members can view classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Teachers can update own classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Teachers can delete own classrooms" ON public.classrooms;

CREATE POLICY "Teachers can create classrooms" ON public.classrooms FOR INSERT TO authenticated WITH CHECK ((auth.uid() = teacher_id) AND has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Members can view classrooms" ON public.classrooms FOR SELECT TO authenticated USING (can_access_classroom(auth.uid(), id));
CREATE POLICY "Teachers can update own classrooms" ON public.classrooms FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own classrooms" ON public.classrooms FOR DELETE TO authenticated USING (auth.uid() = teacher_id);

-- Allow anyone authenticated to view classrooms by code (for joining)
CREATE POLICY "Anyone can find active classrooms by code" ON public.classrooms FOR SELECT TO authenticated USING (is_active = true);

-- classroom_members
DROP POLICY IF EXISTS "Students can join classrooms" ON public.classroom_members;
DROP POLICY IF EXISTS "Members can view classroom members" ON public.classroom_members;
DROP POLICY IF EXISTS "Teachers can update members" ON public.classroom_members;
DROP POLICY IF EXISTS "Members can leave" ON public.classroom_members;

CREATE POLICY "Students can join classrooms" ON public.classroom_members FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND has_role(auth.uid(), 'student'::app_role));
CREATE POLICY "Members can view classroom members" ON public.classroom_members FOR SELECT TO authenticated USING (can_access_classroom(auth.uid(), classroom_id));
CREATE POLICY "Teachers can update members" ON public.classroom_members FOR UPDATE TO authenticated USING (is_classroom_teacher(auth.uid(), classroom_id));
CREATE POLICY "Students can update own record" ON public.classroom_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members can leave" ON public.classroom_members FOR DELETE TO authenticated USING ((auth.uid() = user_id) OR is_classroom_teacher(auth.uid(), classroom_id));

-- profiles
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- quizzes
DROP POLICY IF EXISTS "Members can view quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Teachers can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Teachers can update quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Teachers can delete quizzes" ON public.quizzes;

CREATE POLICY "Members can view quizzes" ON public.quizzes FOR SELECT TO authenticated USING (can_access_classroom(auth.uid(), classroom_id));
CREATE POLICY "Teachers can create quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id));
CREATE POLICY "Teachers can update quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (is_classroom_teacher(auth.uid(), classroom_id));
CREATE POLICY "Teachers can delete quizzes" ON public.quizzes FOR DELETE TO authenticated USING (is_classroom_teacher(auth.uid(), classroom_id));

-- quiz_questions
DROP POLICY IF EXISTS "Members can view questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Teachers can create questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Teachers can update questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Teachers can delete questions" ON public.quiz_questions;

CREATE POLICY "Members can view questions" ON public.quiz_questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND can_access_classroom(auth.uid(), q.classroom_id)));
CREATE POLICY "Teachers can create questions" ON public.quiz_questions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND is_classroom_teacher(auth.uid(), q.classroom_id)));
CREATE POLICY "Teachers can update questions" ON public.quiz_questions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND is_classroom_teacher(auth.uid(), q.classroom_id)));
CREATE POLICY "Teachers can delete questions" ON public.quiz_questions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND is_classroom_teacher(auth.uid(), q.classroom_id)));

-- quiz_answers
DROP POLICY IF EXISTS "Students can submit answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "View own answers or teacher views all" ON public.quiz_answers;

CREATE POLICY "Students can submit answers" ON public.quiz_answers FOR INSERT TO authenticated WITH CHECK ((auth.uid() = student_id) AND (EXISTS (SELECT 1 FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id WHERE qq.id = quiz_answers.question_id AND is_classroom_member(auth.uid(), q.classroom_id))));
CREATE POLICY "View own answers or teacher views all" ON public.quiz_answers FOR SELECT TO authenticated USING ((auth.uid() = student_id) OR (EXISTS (SELECT 1 FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id WHERE qq.id = quiz_answers.question_id AND is_classroom_teacher(auth.uid(), q.classroom_id))));

-- shared_files
DROP POLICY IF EXISTS "Members can view files" ON public.shared_files;
DROP POLICY IF EXISTS "Teachers can share files" ON public.shared_files;
DROP POLICY IF EXISTS "Teachers can delete files" ON public.shared_files;

CREATE POLICY "Members can view files" ON public.shared_files FOR SELECT TO authenticated USING (can_access_classroom(auth.uid(), classroom_id));
CREATE POLICY "Teachers can share files" ON public.shared_files FOR INSERT TO authenticated WITH CHECK (is_classroom_teacher(auth.uid(), classroom_id));
CREATE POLICY "Teachers can delete files" ON public.shared_files FOR DELETE TO authenticated USING (is_classroom_teacher(auth.uid(), classroom_id));
