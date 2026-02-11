import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClassroomData, submitAnswerAction } from "@/hooks/useClassroomData";
import { useTabDetection } from "@/hooks/useTabDetection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, CheckCircle2, AlertTriangle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const StudentDashboard = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { classroom, members, quizzes, quizAnswers, sharedFiles, loading } = useClassroomData(classroomId);

  const myMembership = members.find((m) => m.user_id === user?.id);

  useTabDetection(classroomId || null, user?.id || null, classroom?.is_active ?? false);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading classroom...</p>
      </div>
    );
  }

  if (!classroom || !myMembership) {
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

  const handleSubmitAnswer = async (questionId: string, correctIndex: number) => {
    const selected = selectedAnswers[questionId];
    if (selected === undefined || !user) return;
    await submitAnswerAction(questionId, user.id, selected, correctIndex);
    setSubmittedQuestions(new Set([...submittedQuestions, questionId]));
  };

  const activeQuizzes = quizzes.filter((q) => q.is_active);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground/5 liquid-glass-subtle">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Hi, {myMembership.name}!</h1>
            <p className="text-sm text-muted-foreground">{classroom.teacher_name}'s Class</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant={classroom.is_active ? "default" : "secondary"} className="text-sm">
              {classroom.is_active ? "🟢 Class Active" : "Class Ended"}
            </Badge>
          </div>
        </div>
      </header>

      {!myMembership.is_tab_active && classroom.is_active && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="liquid-glass rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Your teacher can see you switched tabs! Stay focused.
            </p>
          </div>
        </div>
      )}

      {!classroom.is_active && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="liquid-glass rounded-xl px-4 py-3 text-center">
            <p className="text-muted-foreground">This class has ended. Thank you for attending!</p>
            <Button variant="outline" className="mt-2" onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {classroom.is_active && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="liquid-glass rounded-2xl border-0">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{myMembership.tab_switch_count}</p>
                <p className="text-xs text-muted-foreground">Tab Switches</p>
              </CardContent>
            </Card>
            <Card className="liquid-glass rounded-2xl border-0">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{myMembership.is_present ? "✓" : "✗"}</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeQuizzes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> Quizzes
            </h2>
            {activeQuizzes.map((quiz) => (
              <Card key={quiz.id} className="liquid-glass rounded-2xl border-0">
                <CardHeader>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <CardDescription>{quiz.questions.length} questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quiz.questions.map((q, qi) => {
                    const isSubmitted = submittedQuestions.has(q.id);
                    const existingAnswer = quizAnswers.find(
                      (a: any) => a.student_id === user?.id && a.question_id === q.id
                    );
                    const done = isSubmitted || !!existingAnswer;

                    return (
                      <div key={q.id} className="border rounded-lg p-4 space-y-3">
                        <p className="font-medium">{qi + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => {
                            const isSelected = selectedAnswers[q.id] === oi;
                            const wasSelected = existingAnswer?.selected_index === oi;
                            return (
                              <button
                                key={oi}
                                disabled={done}
                                onClick={() => setSelectedAnswers({ ...selectedAnswers, [q.id]: oi })}
                                className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                                  done && wasSelected
                                    ? existingAnswer?.is_correct
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
                            onClick={() => handleSubmitAnswer(q.id, q.correct_index)}
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

        {sharedFiles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Shared Files
            </h2>
            {sharedFiles.map((f: any) => (
              <Card key={f.id} className="liquid-glass rounded-2xl border-0">
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
