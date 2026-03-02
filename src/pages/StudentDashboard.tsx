import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClassroomData, submitAnswerAction } from "@/hooks/useClassroomData";
import { useTabDetection, pauseTabDetection } from "@/hooks/useTabDetection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Brain, CheckCircle2, AlertTriangle, ArrowLeft,
  Eye, EyeOff, Award, Zap, BookOpen, Download,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import FilePreviewDialog from "@/components/FilePreviewDialog";

const StudentDashboard = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classroom, members, quizzes, quizAnswers, sharedFiles, loading } = useClassroomData(classroomId);

  const myMembership = members.find((m) => m.user_id === user?.id);

  useTabDetection(classroomId || null, user?.id || null, classroom?.is_active ?? false);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);

  // Compute quiz stats
  const quizStats = useMemo(() => {
    if (!user) return { total: 0, answered: 0, correct: 0 };
    const activeQuizzes = quizzes.filter((q) => q.is_active);
    const totalQuestions = activeQuizzes.reduce((sum, q) => sum + q.questions.length, 0);
    const myAnswers = quizAnswers.filter((a: any) => a.student_id === user.id);
    const correctAnswers = myAnswers.filter((a: any) => a.is_correct);
    return { total: totalQuestions, answered: myAnswers.length, correct: correctAnswers.length };
  }, [quizzes, quizAnswers, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium">Entering classroom...</p>
        </div>
      </div>
    );
  }

  if (!classroom || !myMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md liquid-glass rounded-2xl border-0 animate-fade-in">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-muted-foreground">Classroom not found or access denied.</p>
            <Button onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmitAnswer = async (questionId: string, correctIndex: number) => {
    const selected = selectedAnswers[questionId];
    if (selected === undefined || !user) return;
    await submitAnswerAction(questionId, user.id, selected, correctIndex);
    setSubmittedQuestions(new Set([...submittedQuestions, questionId]));
  };

  const activeQuizzes = quizzes.filter((q) => q.is_active);
  const progressPercent = quizStats.total > 0 ? Math.round((quizStats.answered / quizStats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/5 liquid-glass-subtle sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold leading-tight">Hi, {myMembership.name}! 👋</h1>
              <p className="text-xs text-muted-foreground">{classroom.teacher_name}'s Class</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge
              variant={classroom.is_active ? "default" : "secondary"}
              className={`text-xs ${classroom.is_active ? "animate-pulse" : ""}`}
            >
              {classroom.is_active ? "🟢 Live" : "Ended"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Tab warning */}
      {!myMembership.is_tab_active && classroom.is_active && (
        <div className="max-w-4xl mx-auto px-4 mt-4 animate-fade-in">
          <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-destructive/30 bg-destructive/5">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <EyeOff className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">Tab switch detected!</p>
              <p className="text-xs text-muted-foreground">Your teacher can see you left this tab. Stay focused.</p>
            </div>
          </div>
        </div>
      )}

      {/* Class ended banner */}
      {!classroom.is_active && (
        <div className="max-w-4xl mx-auto px-4 mt-4 animate-fade-in">
          <div className="liquid-glass rounded-2xl px-5 py-4 text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">🎓 This class has ended. Thank you for attending!</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        {classroom.is_active && (
          <div className="grid grid-cols-3 gap-3 animate-fade-in">
            <Card className="liquid-glass rounded-2xl border-0 hover-scale">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  {myMembership.is_present ? (
                    <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[hsl(var(--warning))]" />
                  )}
                </div>
                <p className="text-lg font-bold">{myMembership.is_present ? "Present" : "Absent"}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</p>
              </CardContent>
            </Card>

            <Card className="liquid-glass rounded-2xl border-0 hover-scale">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <p className="text-lg font-bold">{myMembership.tab_switch_count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tab Switches</p>
              </CardContent>
            </Card>

            <Card className="liquid-glass rounded-2xl border-0 hover-scale">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Award className="w-5 h-5 text-[hsl(var(--warning))]" />
                </div>
                <p className="text-lg font-bold">
                  {quizStats.correct}/{quizStats.total}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quiz progress bar */}
        {activeQuizzes.length > 0 && quizStats.total > 0 && (
          <Card className="liquid-glass rounded-2xl border-0 animate-fade-in">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[hsl(var(--warning))]" />
                  <span className="text-sm font-semibold">Quiz Progress</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {quizStats.answered}/{quizStats.total} answered
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Quizzes */}
        {activeQuizzes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2 px-1">
              <Brain className="w-5 h-5 text-primary" /> Active Quizzes
            </h2>
            {activeQuizzes.map((quiz, quizIndex) => (
              <Card
                key={quiz.id}
                className="liquid-glass rounded-2xl border-0 animate-fade-in"
                style={{ animationDelay: `${quizIndex * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{quiz.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {quiz.questions.length} Qs
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quiz.questions.map((q, qi) => {
                    const isSubmitted = submittedQuestions.has(q.id);
                    const existingAnswer = quizAnswers.find(
                      (a: any) => a.student_id === user?.id && a.question_id === q.id
                    );
                    const done = isSubmitted || !!existingAnswer;

                    return (
                      <div
                        key={q.id}
                        className="rounded-xl liquid-glass-subtle p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                            {qi + 1}
                          </span>
                          <p className="font-medium text-sm leading-relaxed">{q.question}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                          {q.options.map((opt, oi) => {
                            const isSelected = selectedAnswers[q.id] === oi;
                            const wasSelected = existingAnswer?.selected_index === oi;
                            const isCorrectAnswer = done && oi === q.correct_index;
                            return (
                              <button
                                key={oi}
                                disabled={done}
                                onClick={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: oi })}
                                className={`p-3 rounded-xl border text-left text-sm transition-all duration-200 ${
                                  done && wasSelected
                                    ? existingAnswer?.is_correct
                                      ? "bg-[hsl(var(--success))]/15 border-[hsl(var(--success))] ring-1 ring-[hsl(var(--success))]/30"
                                      : "bg-destructive/10 border-destructive ring-1 ring-destructive/30"
                                    : done && isCorrectAnswer
                                    ? "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/50"
                                    : isSelected
                                    ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-[1.02]"
                                    : "border-border/50 hover:bg-muted/50 hover:border-primary/30"
                                } ${done ? "cursor-default" : "cursor-pointer active:scale-[0.98]"}`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    {String.fromCharCode(65 + oi)}
                                  </span>
                                  {opt}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="pl-10">
                          {!done ? (
                            <Button
                              size="sm"
                              disabled={selectedAnswers[q.id] === undefined}
                              onClick={() => handleSubmitAnswer(q.id, q.correct_index)}
                              className="gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Submit
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs">
                              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                              <span className="text-muted-foreground font-medium">
                                {existingAnswer?.is_correct ? "Correct! 🎉" : "Answered"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty quiz state */}
        {activeQuizzes.length === 0 && classroom.is_active && (
          <Card className="liquid-glass rounded-2xl border-0 animate-fade-in">
            <CardContent className="py-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">No active quizzes yet. Sit tight!</p>
            </CardContent>
          </Card>
        )}

        {/* Shared files */}
        {sharedFiles.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2 px-1">
              <FileText className="w-5 h-5 text-primary" /> Shared Files
            </h2>
            <div className="grid gap-2">
              {sharedFiles.map((f: any, i: number) => (
                <Card
                  key={f.id}
                  className="liquid-glass rounded-2xl border-0 hover-scale animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{f.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setPreviewFile({ name: f.name, url: f.url })}
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
};

export default StudentDashboard;
