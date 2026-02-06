import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClassroom, stopClassroom, markAttendance, toggleStudentPresence, addQuiz, shareFile } from "@/lib/store";
import type { QuizQuestion } from "@/lib/store";
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
  Copy, Users, ClipboardCheck, FileText, Brain, Power, Plus, Trash2, Check, X, AlertTriangle, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";

const TeacherDashboard = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const classroom = useClassroom(classroomId || "");

  // Quiz creation state
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<{ question: string; options: string[]; correctIndex: number }[]>([
    { question: "", options: ["", "", "", ""], correctIndex: 0 },
  ]);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);

  if (!classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Classroom not found.</p>
            <Button className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const copyCode = () => {
    navigator.clipboard.writeText(classroom.code);
    toast.success("Code copied!");
  };

  const handleStopClass = () => {
    stopClassroom(classroom.id);
    toast.info("Class ended");
  };

  const handleMarkAttendance = () => {
    markAttendance(classroom.id);
    toast.success("Attendance marked for all present students");
  };

  const handleShareFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        shareFile(classroom.id, { name: file.name, url });
        toast.success(`"${file.name}" shared with students`);
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
    setQuestions(
      questions.map((q, i) =>
        i === idx ? { ...q, [field]: value } : q
      )
    );
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions(
      questions.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q
      )
    );
  };

  const handleCreateQuiz = () => {
    if (!quizTitle.trim()) return;
    const valid = questions.every(
      (q) => q.question.trim() && q.options.every((o) => o.trim())
    );
    if (!valid) {
      toast.error("Fill in all questions and options");
      return;
    }
    const quizQuestions: Omit<QuizQuestion, "id">[] = questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
    }));
    addQuiz(classroom.id, { title: quizTitle, questions: quizQuestions as QuizQuestion[] });
    toast.success("Quiz created and shared!");
    setQuizTitle("");
    setQuestions([{ question: "", options: ["", "", "", ""], correctIndex: 0 }]);
    setQuizDialogOpen(false);
  };

  const distracted = classroom.students.filter((s) => !s.isTabActive);
  const quizResults = (quizId: string) => {
    const quiz = classroom.quizzes.find((q) => q.id === quizId);
    if (!quiz) return [];
    return classroom.students.map((s) => {
      const answers = classroom.quizAnswers.filter(
        (a) => a.studentId === s.id && quiz.questions.some((q) => q.id === a.questionId)
      );
      const correct = answers.filter((a) => a.isCorrect).length;
      return { student: s, correct, total: quiz.questions.length, answered: answers.length };
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">{classroom.teacherName}'s Classroom</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={classroom.isActive ? "default" : "secondary"}>
                {classroom.isActive ? "Live" : "Ended"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {classroom.students.length} student{classroom.students.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
              <span className="text-sm text-muted-foreground">Code:</span>
              <span className="font-mono text-xl font-bold tracking-widest">{classroom.code}</span>
              <Button variant="ghost" size="icon" onClick={copyCode}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            {classroom.isActive && (
              <Button variant="destructive" size="sm" onClick={handleStopClass} className="gap-1">
                <Power className="w-4 h-4" /> End Class
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Alert for distracted students */}
      {distracted.length > 0 && classroom.isActive && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm">
              <span className="font-semibold text-destructive">{distracted.length} student{distracted.length > 1 ? "s" : ""}</span>{" "}
              switched away from this tab: {distracted.map((s) => s.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="students">
          <TabsList className="mb-6">
            <TabsTrigger value="students" className="gap-1.5">
              <Users className="w-4 h-4" /> Students
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1.5">
              <ClipboardCheck className="w-4 h-4" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-1.5">
              <Brain className="w-4 h-4" /> Quizzes
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1.5">
              <FileText className="w-4 h-4" /> Files
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Connected Students</CardTitle>
                <CardDescription>Students who joined with your class code</CardDescription>
              </CardHeader>
              <CardContent>
                {classroom.students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students have joined yet. Share your code!</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Tab Status</TableHead>
                        <TableHead>Tab Switches</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classroom.students.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            {s.isTabActive ? (
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
                            <span className={s.tabSwitchCount > 2 ? "text-destructive font-semibold" : ""}>
                              {s.tabSwitchCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {s.joinedAt.toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Attendance</CardTitle>
                  <CardDescription>Toggle presence for each student, then mark attendance</CardDescription>
                </div>
                <Button
                  onClick={handleMarkAttendance}
                  disabled={classroom.attendanceMarked || classroom.students.length === 0}
                  className="gap-1"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {classroom.attendanceMarked ? "Marked ✓" : "Mark Attendance"}
                </Button>
              </CardHeader>
              <CardContent>
                {classroom.students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students to mark</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Present</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classroom.students.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <Button
                              variant={s.isPresent ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleStudentPresence(classroom.id, s.id)}
                              className="gap-1"
                            >
                              {s.isPresent ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {s.isPresent ? "Present" : "Absent"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Quizzes</h2>
                <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-1">
                      <Plus className="w-4 h-4" /> Create Quiz
                    </Button>
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
                          <Textarea
                            value={q.question}
                            onChange={(e) => updateQuestion(qi, "question", e.target.value)}
                            placeholder="Enter question"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((o, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(qi, "correctIndex", oi)}
                                  className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                    q.correctIndex === oi
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground"
                                  }`}
                                >
                                  {q.correctIndex === oi && <Check className="w-3 h-3" />}
                                </button>
                                <Input
                                  value={o}
                                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                                  placeholder={`Option ${oi + 1}`}
                                  className="text-sm"
                                />
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

              {classroom.quizzes.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No quizzes yet. Create one to engage your students!
                  </CardContent>
                </Card>
              ) : (
                classroom.quizzes.map((quiz) => {
                  const results = quizResults(quiz.id);
                  return (
                    <Card key={quiz.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>
                          {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""} · Created{" "}
                          {quiz.createdAt.toLocaleTimeString()}
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
                                  <TableCell>
                                    {r.answered > 0 ? `${r.correct}/${r.total}` : "—"}
                                  </TableCell>
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

          {/* Files Tab */}
          <TabsContent value="files">
            <Card>
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
                {classroom.sharedFiles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No files shared yet</p>
                ) : (
                  <div className="space-y-2">
                    {classroom.sharedFiles.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{f.sharedAt.toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={f.url} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherDashboard;
