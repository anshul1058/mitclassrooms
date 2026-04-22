import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClassroomData, stopClassroomAction, markAttendanceAction, togglePresenceAction, addQuizAction, shareFileAction, deleteFileAction } from "@/hooks/useClassroomData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy, Users, ClipboardCheck, FileText, Brain, Power, Plus, Trash2, Check, X, AlertTriangle, Eye, EyeOff, Download, MessageCircle, Bell, BellOff, ArrowLeft, GraduationCap, Activity
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import FilePreviewDialog from "@/components/FilePreviewDialog";
import { motion } from "framer-motion";
import { useWakeLock } from "@/hooks/useWakeLock";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const TeacherDashboard = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classroom, members, quizzes, quizAnswers, sharedFiles, loading } = useClassroomData(classroomId);
  useWakeLock(classroom?.is_active ?? false);

  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<{ question: string; options: string[]; correctIndex: number }[]>([
    { question: "", options: ["", "", "", ""], correctIndex: 0 },
  ]);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(230,100%,97%)] to-background dark:from-[hsl(222,47%,8%)] dark:to-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium">Loading classroom...</p>
        </motion.div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(230,100%,97%)] to-background dark:from-[hsl(222,47%,8%)] dark:to-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="max-w-md rounded-2xl border-0 shadow-xl">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-muted-foreground">Classroom not found.</p>
              <Button onClick={() => navigate("/")} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Go Home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const copyCode = () => {
    navigator.clipboard.writeText(classroom.code);
    toast.success("Code copied!");
  };

  const handleStopClass = async () => {
    await stopClassroomAction(classroom.id);
    toast.info("Class ended");
  };

  const handleMarkAttendance = async () => {
    await markAttendanceAction(classroom.id);
    toast.success("Attendance marked for all present students");
  };

  const handleShareFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.png";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast.loading("Uploading file...", { id: "file-upload" });
        await shareFileAction(classroom.id, file.name, file);
        toast.success(`"${file.name}" shared with students`, { id: "file-upload" });
      }
    };
    input.click();
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctIndex: 0 }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: string | number) => {
    setQuestions(questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(questions.map((q, i) => (i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q)));
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) return;
    const valid = questions.every((q) => q.question.trim() && q.options.every((o) => o.trim()));
    if (!valid) { toast.error("Fill in all questions and options"); return; }
    await addQuizAction(classroom.id, quizTitle, questions);
    toast.success("Quiz created and shared!");
    setQuizTitle("");
    setQuestions([{ question: "", options: ["", "", "", ""], correctIndex: 0 }]);
    setQuizDialogOpen(false);
  };

  const distracted = members.filter((s) => !s.is_tab_active);

  const quizResults = (quizId: string) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return [];
    return members.map((s) => {
      const answers = quizAnswers.filter(
        (a) => a.student_id === s.user_id && quiz.questions.some((q) => q.id === a.question_id)
      );
      const correct = answers.filter((a: any) => a.is_correct).length;
      return { student: s, correct, total: quiz.questions.length, answered: answers.length };
    });
  };

  const presentCount = members.filter((m) => m.is_present).length;
  const initials = (classroom.teacher_name || "T")
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(230,100%,97%)] to-background dark:from-[hsl(222,47%,8%)] dark:to-background">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/60 dark:bg-background/40 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
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
              <h1 className="text-xl sm:text-2xl font-bold leading-tight flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary hidden sm:inline" />
                {classroom.teacher_name}'s Classroom
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {classroom.is_active ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[hsl(145,60%,42%)]/15 border border-[hsl(145,60%,42%)]/30 text-[10px] font-semibold text-[hsl(145,60%,42%)]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(145,60%,42%)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(145,60%,42%)]" />
                    </span>
                    Live
                  </span>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Ended</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {members.length} student{members.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-card/70 dark:bg-card/40 backdrop-blur-sm border border-border/30 shadow-sm">
              <span className="text-xs text-muted-foreground hidden sm:inline">Code</span>
              <span className="font-mono text-base font-bold tracking-widest text-primary">{classroom.code}</span>
              <button onClick={copyCode} className="w-7 h-7 rounded-md hover:bg-muted/50 flex items-center justify-center transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            {classroom.is_active && (
              <Button variant="destructive" size="sm" onClick={handleStopClass} className="gap-1 rounded-xl shadow-md">
                <Power className="w-4 h-4" /> End Class
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Distraction banner */}
      {distracted.length > 0 && classroom.is_active && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto px-4 mt-4"
        >
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 bg-[hsl(45,100%,90%)] dark:bg-[hsl(45,60%,18%)] border-l-4 border-[hsl(30,96%,49%)] shadow-md">
            <div className="w-10 h-10 rounded-full bg-[hsl(30,96%,49%)]/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-[hsl(30,96%,49%)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[hsl(30,60%,25%)] dark:text-[hsl(30,96%,70%)]">
                {distracted.length} student{distracted.length > 1 ? "s" : ""} distracted
              </p>
              <p className="text-xs text-[hsl(30,40%,40%)] dark:text-[hsl(30,40%,60%)] truncate">
                {distracted.map((s) => s.name).join(", ")}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        {classroom.is_active && (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-primary/20 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/70 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
                <CardContent className="pt-5 pb-4 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(210,90%,70%)] to-primary flex items-center justify-center mx-auto mb-3 shadow-md shadow-primary/20">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold">{members.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Students</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-[hsl(145,60%,42%)]/20 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/70 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
                <CardContent className="pt-5 pb-4 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[hsl(145,60%,42%)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(145,60%,70%)] to-[hsl(145,60%,42%)] flex items-center justify-center mx-auto mb-3 shadow-md shadow-[hsl(145,60%,42%)]/20">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold">{presentCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Present</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-warning/20 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/70 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
                <CardContent className="pt-5 pb-4 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(45,100%,65%)] to-warning flex items-center justify-center mx-auto mb-3 shadow-md shadow-warning/20">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold">{distracted.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Distracted</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border border-[hsl(250,80%,60%)]/20 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card/70 dark:bg-card/50 backdrop-blur-sm overflow-hidden group">
                <CardContent className="pt-5 pb-4 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[hsl(250,80%,60%)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(270,80%,75%)] to-[hsl(250,80%,60%)] flex items-center justify-center mx-auto mb-3 shadow-md shadow-[hsl(250,80%,60%)]/20">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold">{quizzes.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Quizzes</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Class controls (toggles) */}
        {classroom.is_active && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-5 pb-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">AI Chat Assistant</p>
                    <p className="text-xs text-muted-foreground">{classroom.chat_enabled ? "Available to students" : "Disabled"}</p>
                  </div>
                  <Switch
                    checked={classroom.chat_enabled}
                    onCheckedChange={async (checked) => {
                      await supabase.from("classrooms").update({ chat_enabled: checked }).eq("id", classroom.id);
                      toast.success(checked ? "AI Chat enabled for students" : "AI Chat disabled for students");
                    }}
                  />
                </div>
                <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    {classroom.notifications_enabled ? (
                      <Bell className="w-5 h-5 text-warning" />
                    ) : (
                      <BellOff className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Student Notifications</p>
                    <p className="text-xs text-muted-foreground">{classroom.notifications_enabled ? "Alerts active" : "Muted for students"}</p>
                  </div>
                  <Switch
                    checked={classroom.notifications_enabled}
                    onCheckedChange={async (checked) => {
                      await supabase.from("classrooms").update({ notifications_enabled: checked }).eq("id", classroom.id);
                      toast.success(checked ? "Notifications enabled for students" : "Notifications muted for students");
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        <Tabs defaultValue="students">
          <TabsList className="mb-6 bg-card/60 dark:bg-card/40 backdrop-blur-sm border border-border/30 shadow-sm rounded-xl p-1 flex-wrap h-auto">
            <TabsTrigger value="students" className="gap-1.5 rounded-lg data-[state=active]:shadow-md"><Users className="w-4 h-4" /> Students</TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1.5 rounded-lg data-[state=active]:shadow-md"><ClipboardCheck className="w-4 h-4" /> Attendance</TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-1.5 rounded-lg data-[state=active]:shadow-md"><Brain className="w-4 h-4" /> Quizzes</TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5 rounded-lg data-[state=active]:shadow-md"><FileText className="w-4 h-4" /> Files</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Connected Students</CardTitle>
                <CardDescription>Students who joined with your class code</CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students have joined yet. Share your code!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>PRN</TableHead>
                        <TableHead>Tab Status</TableHead>
                        <TableHead>Tab Switches</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="font-mono text-sm">{s.prn || "—"}</TableCell>
                          <TableCell>
                            {s.is_tab_active ? (
                              <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] gap-1">
                                <Eye className="w-3 h-3" /> Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <EyeOff className="w-3 h-3" /> Away
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={s.tab_switch_count > 2 ? "text-destructive font-semibold" : ""}>
                              {s.tab_switch_count}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(s.joined_at).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Attendance</CardTitle>
                  <CardDescription>Auto-rule: students who joined ≥ 5 minutes ago are marked Present. You can override below.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={members.length === 0}
                    onClick={() => {
                      const data = members.map((s) => ({
                        Name: s.name,
                        PRN: s.prn || "—",
                        Status: s.is_present ? "Present" : "Absent",
                      }));
                      const ws = XLSX.utils.json_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
                      XLSX.writeFile(wb, `Attendance_${classroom.code}_${new Date().toLocaleDateString()}.xlsx`);
                      toast.success("Attendance downloaded!");
                    }}
                  >
                    <Download className="w-4 h-4" /> Download Excel
                  </Button>
                  <Button
                    onClick={handleMarkAttendance}
                    disabled={classroom.attendance_marked || members.length === 0}
                    className="gap-1"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    {classroom.attendance_marked ? "Marked ✓" : "Mark Attendance"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students to mark</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>PRN</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="font-mono text-sm">{s.prn || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={s.is_present ? "default" : "outline"}
                                size="sm"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (!s.is_present) {
                                    await supabase.from("classroom_members").update({ is_present: true }).eq("id", s.id);
                                  }
                                }}
                                className="gap-1 min-w-[60px]"
                              >
                                <Check className="w-3 h-3" /> P
                              </Button>
                              <Button
                                variant={!s.is_present ? "destructive" : "outline"}
                                size="sm"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (s.is_present) {
                                    await supabase.from("classroom_members").update({ is_present: false }).eq("id", s.id);
                                  }
                                }}
                                className="gap-1 min-w-[60px]"
                              >
                                <X className="w-3 h-3" /> A
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Quizzes</h2>
                <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-1"><Plus className="w-4 h-4" /> Create Quiz</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create a Quiz</DialogTitle>
                      <DialogDescription>Add questions with 4 options each. Select the correct answer.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Quiz Title</Label>
                        <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="e.g. Chapter 5 Review" />
                      </div>
                      {questions.map((q, qi) => (
                        <Card key={qi} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Question {qi + 1}</Label>
                            {questions.length > 1 && (
                              <Button variant="ghost" size="icon" onClick={() => removeQuestion(qi)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <Textarea value={q.question} onChange={(e) => updateQuestion(qi, "question", e.target.value)} placeholder="Enter question" />
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((o, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(qi, "correctIndex", oi)}
                                  className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                    q.correctIndex === oi ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                                  }`}
                                >
                                  {q.correctIndex === oi && <Check className="w-3 h-3" />}
                                </button>
                                <Input value={o} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="text-sm" />
                              </div>
                            ))}
                          </div>
                        </Card>
                      ))}
                      <Button variant="outline" onClick={addQuestion} className="w-full gap-1">
                        <Plus className="w-4 h-4" /> Add Question
                      </Button>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateQuiz}>Create & Share Quiz</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {quizzes.length === 0 ? (
                <Card className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No quizzes yet. Create one to engage your students!
                  </CardContent>
                </Card>
              ) : (
                quizzes.map((quiz) => {
                  const results = quizResults(quiz.id);
                  return (
                    <Card key={quiz.id} className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>
                          {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""} · Created{" "}
                          {new Date(quiz.created_at).toLocaleTimeString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {results.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {results.map((r) => (
                                <TableRow key={r.student.id}>
                                  <TableCell>{r.student.name}</TableCell>
                                  <TableCell>{r.answered > 0 ? `${r.correct}/${r.total}` : "—"}</TableCell>
                                  <TableCell>
                                    <Badge variant={r.answered === r.total ? "default" : "secondary"}>
                                      {r.answered === r.total ? "Completed" : "Pending"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground">No students have attempted yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="files">
            <Card className="rounded-2xl border-0 shadow-md bg-card/70 dark:bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Shared Files</CardTitle>
                  <CardDescription>Upload PDFs and documents for students</CardDescription>
                </div>
                <Button onClick={handleShareFile} className="gap-1">
                  <Plus className="w-4 h-4" /> Share File
                </Button>
              </CardHeader>
              <CardContent>
                {sharedFiles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No files shared yet</p>
                ) : (
                  <div className="space-y-2">
                    {sharedFiles.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(f.shared_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPreviewFile({ name: f.name, url: f.url })}>
                            Preview
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              await deleteFileAction(f.id, f.storage_path || f.url);
                              toast.success(`"${f.name}" deleted`);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
};

export default TeacherDashboard;
