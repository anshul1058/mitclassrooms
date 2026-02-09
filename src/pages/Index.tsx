import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, Users, GraduationCap, ArrowRight, ClipboardCheck, Brain, FileText, ShieldCheck, LogIn, LogOut } from "lucide-react";
import { createClassroomAction, joinClassroomAction } from "@/hooks/useClassroomData";
import ThemeToggle from "@/components/ThemeToggle";
import mitAoeBg from "@/assets/mit-aoe-bg.jpg";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { user, role, profile, loading, signOut } = useAuth();
  const [classCode, setClassCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreateClass = async () => {
    if (!user) return;
    setActionLoading(true);
    const id = await createClassroomAction(user.id);
    if (id) navigate(`/teacher/${id}`);
    setActionLoading(false);
  };

  const handleJoinClass = async () => {
    if (!user || !classCode.trim()) return;
    setActionLoading(true);
    const id = await joinClassroomAction(classCode.trim().toUpperCase(), user.id);
    if (id) {
      navigate(`/student/${id}`);
    } else {
      setJoinError("Invalid or expired class code");
    }
    setActionLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${mitAoeBg})` }} />
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {user && (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {profile?.name} ({role})
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight">MIT</span>
            <div className="w-px h-10 sm:h-12 bg-foreground/30" />
            <span className="text-lg sm:text-xl font-medium leading-tight text-left">Academy of<br />Engineering</span>
          </div>
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

      {/* Action Area */}
      <main className="relative max-w-md mx-auto px-4 pb-16 -mt-4 w-full">
        {!user ? (
          <Card className="border-2 shadow-lg text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <LogIn className="w-10 h-10 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Sign in to get started</h2>
              <p className="text-sm text-muted-foreground">Create an account or sign in to create or join a classroom.</p>
              <Button className="w-full gap-2" size="lg" onClick={() => navigate("/auth")}>
                <LogIn className="w-4 h-4" /> Sign In / Sign Up
              </Button>
            </CardContent>
          </Card>
        ) : role === "teacher" ? (
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome, {profile?.name}!</CardTitle>
              <CardDescription>Create a new classroom session for your students</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full gap-2" size="lg" onClick={handleCreateClass} disabled={actionLoading}>
                {actionLoading ? "Creating..." : <>Create Classroom <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </CardContent>
          </Card>
        ) : role === "student" ? (
          <Card className="border-2 border-accent/20 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">Welcome, {profile?.name}!</CardTitle>
              <CardDescription>Join your teacher's class with a code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Class code (e.g. ABC123)"
                value={classCode}
                onChange={(e) => { setClassCode(e.target.value.toUpperCase()); setJoinError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleJoinClass()}
                maxLength={6}
                className="font-mono tracking-widest text-center text-lg"
              />
              {joinError && <p className="text-sm text-destructive">{joinError}</p>}
              <Button
                className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                size="lg"
                onClick={handleJoinClass}
                disabled={actionLoading || classCode.length < 6}
              >
                {actionLoading ? "Joining..." : <>Join Class <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 shadow-lg text-center">
            <CardContent className="pt-8 pb-8">
              <p className="text-muted-foreground">Loading your profile...</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Features Section */}
      <section className="relative max-w-5xl mx-auto px-4 pb-16 w-full">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: ClipboardCheck, title: "Attendance Tracking", desc: "Mark attendance instantly and see who's present in real-time." },
            { icon: Brain, title: "Live Quizzes", desc: "Create MCQ quizzes and share them with students during class." },
            { icon: FileText, title: "Share Materials", desc: "Upload and share PDFs, documents, and images with the class." },
            { icon: ShieldCheck, title: "Tab Detection", desc: "Know when students switch tabs or leave the app during class." },
          ].map((f, i) => (
            <Card key={i} className="bg-card/80 backdrop-blur-sm text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t bg-card/60 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MIT Academy of Engineering, Pune. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
