import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClassroom, joinClassroom } from "@/lib/store";
import { BookOpen, Users, GraduationCap, ArrowRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import mitAoeBg from "@/assets/mit-aoe-bg.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleCreateClass = () => {
    if (!teacherName.trim()) return;
    const classroom = createClassroom(teacherName.trim());
    navigate(`/teacher/${classroom.id}`);
  };

  const handleJoinClass = () => {
    if (!studentName.trim() || !classCode.trim()) return;
    const result = joinClassroom(classCode.trim().toUpperCase(), studentName.trim());
    if (!result) {
      setJoinError("Invalid or expired class code");
      return;
    }
    navigate(`/student/${result.classroom.id}/${result.student.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${mitAoeBg})` }}
      />
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            MIT AOE Classrooms
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4">
            Keep Students
            <span className="text-primary"> Focused</span>,
            <br />
            Not on Their Phones
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create a classroom, share a code, track attendance, run quizzes, and detect tab-switching — all without cameras or video calls.
          </p>
        </div>
      </header>

      {/* Cards */}
      <main className="relative max-w-4xl mx-auto px-4 pb-16 -mt-4 w-full grid md:grid-cols-2 gap-6">
        {/* Teacher Card */}
        <Card className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">I'm a Teacher</CardTitle>
            <CardDescription>Create a class and get a join code for your students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Your name"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
            />
            <Button className="w-full gap-2" size="lg" onClick={handleCreateClass} disabled={!teacherName.trim()}>
              Create Classroom <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Student Card */}
        <Card className="border-2 border-accent/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <CardTitle className="text-2xl">I'm a Student</CardTitle>
            <CardDescription>Join your teacher's class with a code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Your name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
            <Input
              placeholder="Class code (e.g. ABC123)"
              value={classCode}
              onChange={(e) => {
                setClassCode(e.target.value.toUpperCase());
                setJoinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinClass()}
              maxLength={6}
              className="font-mono tracking-widest text-center text-lg"
            />
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            <Button
              className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              size="lg"
              onClick={handleJoinClass}
              disabled={!studentName.trim() || classCode.length < 6}
            >
              Join Class <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
