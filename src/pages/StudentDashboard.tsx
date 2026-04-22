import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClassroomData, submitAnswerAction } from "@/hooks/useClassroomData";
import { useTabDetection } from "@/hooks/useTabDetection";
import { useWakeLock } from "@/hooks/useWakeLock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Brain, CheckCircle2, AlertTriangle, ArrowLeft,
  Eye, EyeOff, Award, Zap, BookOpen, Download, RefreshCw, X,
} from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import FilePreviewDialog from "@/components/FilePreviewDialog";
import ChatWidget from "@/components/ChatWidget";
import { motion, AnimatePresence } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const StudentDashboard = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classroom, members, quizzes, quizAnswers, sharedFiles, loading } = useClassroomData(classroomId);

  const myMembership = members.find((m) => m.user_id === user?.id);

  useTabDetection(classroomId || null, user?.id || null, classroom?.is_active ?? false, () => {
    toast.error("You were removed for switching tabs more than 5 times.");
    setTimeout(() => navigate("/"), 1500);
  });
  useWakeLock(classroom?.is_active ?? false);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);
  const [tabWarningDismissed, setTabWarningDismissed] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(230,100%,97%)] to-background dark:from-[hsl(222,47%,8%)] dark:to-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium">Entering classroom...</p>
        </motion.div>
      </div>
    );
  }

  if (!classroom || !myMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(230,100%,97%)] to-background dark:from-[hsl(222,47%,8%)] dark:to-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-md rounded-2xl border-0 shadow-xl">
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
        </motion.div>
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

  const initials = myMembership.name
    ? myMembership.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const showTabWarning = !myMembership.is_tab_active && classroom.is_active && !tabWarningDismissed && classroom.notifications_enabled;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(230,100%,97%)] to-background dark:from-[hsl(222,47%,8%)] dark:to-background">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/60 dark:bg-background/40 border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-9 h-9 rounded-full bg-card/80 dark:bg-card/50 backdrop-blur-sm border border-border/30 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[hsl(250,80%,60%)] flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md">
              {initials}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">Hi, {myMembership.name}! 👋</h1>
              <p className="text-xs text-muted-foreground">{classroom.teacher_name}'s Class</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="w-9 h-9 rounded-full bg-card/80 dark:bg-card/50 backdrop-blur-sm border border-border/30 flex items-center justify-center hover:scale-105 hover:rotate-180 transition-all duration-500"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <ThemeToggle />
            {classroom.is_active ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(145,60%,42%)]/15 border border-[hsl(145,60%,42%)]/30 text-xs font-semibold text-[hsl(145,60%,42%)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(145,60%,42%)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(145,60%,42%)]" />
                </span>
                Live
              </span>
            ) : (
              <Badge variant="secondary" className="text-xs">Ended</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Tab warning banner */}
      <AnimatePresence>
        {showTabWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="max-w-4xl mx-auto px-4 mt-4"
          >
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3 bg-[hsl(45,100%,90%)] dark:bg-[hsl(45,60%,18%)] border-l-4 border-[hsl(30,96%,49%)] shadow-md">
              <div className="w-10 h-10 rounded-full bg-[hsl(30,96%,49%)]/15 flex items-center justify-center flex-shrink-0">
                <EyeOff className="w-5 h-5 text-[hsl(30,96%,49%)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[hsl(30,60%,25%)] dark:text-[hsl(30,96%,70%)]">Tab switch detected!</p>
                <p className="text-xs text-[hsl(30,40%,40%)] dark:text-[hsl(30,40%,60%)]">Your teacher noticed. Stay focused 🎯</p>
              </div>
              <button
                onClick={() => setTabWarningDismissed(true)}
                className="w-8 h-8 rounded-full hover:bg-[hsl(30,96%,49%)]/10 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-[hsl(30,60%,35%)] dark:text-[hsl(30,60%,60%)]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Class ended banner */}
      {!classroom.is_active && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 mt-4">
          <div className="rounded-2xl px-5 py-4 text-center space-y-2 bg-card/60 dark:bg-card/40 backdrop-blur-sm border border-border/30 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">🎓 This class has ended. Thank you for attending!</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </div>
        </motion.div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        {classroom.is_active && (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-3">
            {/* Attendance */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-[hsl(145,60%,42%)]/20 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/70 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
                <CardContent className="pt-5 pb-4 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[hsl(145,60%,42%)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(145,60%,70%)] to-[hsl(145,60%,42%)] flex items-center justify-center mx-auto mb-3 shadow-md shadow-[hsl(145,60%,42%)]/20">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xl font-bold">{myMembership.is_present ? "Present" : "Absent"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Attendance</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tab Switches */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-primary/20 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/70 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
                <CardContent className="pt-5 pb-4 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(210,90%,70%)] to-primary flex items-center justify-center mx-auto mb-3 shadow-md shadow-primary/20">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xl font-bold">{myMembership.tab_switch_count}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Tab Switches</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Score */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-warning/20 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/70 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
                <CardContent className="pt-5 pb-4 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(45,100%,65%)] to-warning flex items-center justify-center mx-auto mb-3 shadow-md shadow-warning/20">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xl font-bold">{quizStats.correct}/{quizStats.total}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Score</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Quiz progress bar */}
        {activeQuizzes.length > 0 && quizStats.total > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-warning" />
                    <span className="text-sm font-semibold">Quiz Progress</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {quizStats.answered}/{quizStats.total} answered
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quizzes */}
        {activeQuizzes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold flex items-center gap-2 px-1">
              <Brain className="w-5 h-5 text-primary" /> Active Quizzes
            </h2>
            {activeQuizzes.map((quiz, quizIndex) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + quizIndex * 0.1 }}
              >
                <Card className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
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
                        <div key={q.id} className="rounded-xl bg-muted/20 dark:bg-muted/10 p-4 space-y-3 border border-border/20">
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
                                        ? "bg-success/15 border-success ring-1 ring-success/30"
                                        : "bg-destructive/10 border-destructive ring-1 ring-destructive/30"
                                      : done && isCorrectAnswer
                                      ? "bg-success/10 border-success/50"
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
                                <CheckCircle2 className="w-4 h-4 text-success" />
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
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty quiz state */}
        {activeQuizzes.length === 0 && classroom.is_active && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="py-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <BookOpen className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">No active quizzes yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Your teacher will launch one soon. Stay ready! ✨</p>
                </div>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Waiting...
                </span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Shared files */}
        {sharedFiles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2 px-1">
              <FileText className="w-5 h-5 text-primary" /> Shared Files
            </h2>
            <div className="grid gap-2">
              {sharedFiles.map((f: any, i: number) => (
                <motion.div key={f.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.08 }}>
                  <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 bg-card/70 dark:bg-card/50 backdrop-blur-sm">
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
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile}
      />
      {classroom.is_active && classroom.chat_enabled && <ChatWidget />}
    </div>
  );
};

export default StudentDashboard;
