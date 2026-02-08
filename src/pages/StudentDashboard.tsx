import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useClassroom, submitQuizAnswer } from "@/lib/store";
import { useTabDetection } from "@/hooks/useTabDetection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, CheckCircle2, AlertTriangle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const StudentDashboard = () => {
  const { classroomId, studentId } = useParams<{ classroomId: string; studentId: string }>();
  const navigate = useNavigate();
  const classroom = useClassroom(classroomId || "");
  const student = classroom?.students.find((s) => s.id === studentId);

  // Tab detection
  useTabDetection(classroomId || null, studentId || null, classroom?.isActive ?? false);

  // Quiz answer state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());

  if (!classroom || !student) {
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

  const handleSubmitAnswer = (quizId: string, questionId: string, correctIndex: number) => {
    const selected = selectedAnswers[questionId];
    if (selected === undefined) return;
    submitQuizAnswer(classroom.id, {
      studentId: student.id,
      studentName: student.name,
      questionId,
      selectedIndex: selected,
    }, correctIndex);
    setSubmittedQuestions(new Set([...submittedQuestions, questionId]));
  };

  const activeQuizzes = classroom.quizzes.filter((q) => q.isActive);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Hi, {student.name}!</h1>
            <p className="text-sm text-muted-foreground">{classroom.teacherName}'s Class</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant={classroom.isActive ? "default" : "secondary"} className="text-sm">
              {classroom.isActive ? "🟢 Class Active" : "Class Ended"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Tab switch warning */}
      {!student.isTabActive && classroom.isActive && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Your teacher can see you switched tabs! Stay focused.
            </p>
          </div>
        </div>
      )}

      {!classroom.isActive && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-muted rounded-lg px-4 py-3 text-center">
            <p className="text-muted-foreground">This class has ended. Thank you for attending!</p>
            <Button variant="outline" className="mt-2" onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        {classroom.isActive && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{student.tabSwitchCount}</p>
                <p className="text-xs text-muted-foreground">Tab Switches</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{student.isPresent ? "✓" : "✗"}</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quizzes */}
        {activeQuizzes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> Quizzes
            </h2>
            {activeQuizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <CardDescription>{quiz.questions.length} questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quiz.questions.map((q, qi) => {
                    const isSubmitted = submittedQuestions.has(q.id);
                    const existingAnswer = classroom.quizAnswers.find(
                      (a) => a.studentId === student.id && a.questionId === q.id
                    );
                    const done = isSubmitted || !!existingAnswer;

                    return (
                      <div key={q.id} className="border rounded-lg p-4 space-y-3">
                        <p className="font-medium">
                          {qi + 1}. {q.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => {
                            const isSelected = selectedAnswers[q.id] === oi;
                            const wasSelected = existingAnswer?.selectedIndex === oi;
                            return (
                              <button
                                key={oi}
                                disabled={done}
                                onClick={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: oi })}
                                className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                                  done && wasSelected
                                    ? existingAnswer?.isCorrect
                                      ? "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]"
                                      : "bg-destructive/10 border-destructive"
                                    : isSelected
                                    ? "border-primary bg-primary/10"
                                    : "hover:bg-muted"
                                } ${done ? "cursor-default" : "cursor-pointer"}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {!done ? (
                          <Button
                            size="sm"
                            disabled={selectedAnswers[q.id] === undefined}
                            onClick={() => handleSubmitAnswer(quiz.id, q.id, q.correctIndex)}
                          >
                            Submit Answer
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                            <span className="text-muted-foreground">Answered</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Shared Files */}
        {classroom.sharedFiles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Shared Files
            </h2>
            {classroom.sharedFiles.map((f) => (
              <Card key={f.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium text-sm">{f.name}</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={f.url} target="_blank" rel="noopener noreferrer">View</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
