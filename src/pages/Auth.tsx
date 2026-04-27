import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { GraduationCap, Users, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import mitAoeBg from "@/assets/mit-aoe-bg.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [prn, setPrn] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return toast.error("Please enter your email");
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent. Check your email.");
    setForgotOpen(false);
    setForgotEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      if (!name.trim()) {
        toast.error("Please enter your name");
        setLoading(false);
        return;
      }
      if (role === "student" && !prn.trim()) {
        toast.error("Please enter your PRN number");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, {
        name: name.trim(),
        role,
        ...(role === "student" ? { prn: prn.trim() } : {}),
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! Please check your email to verify your account.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${mitAoeBg})` }} />
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />

      <div className="absolute top-4 right-4 z-10">
        <div className="liquid-glass-subtle rounded-full">
          <ThemeToggle />
        </div>
      </div>

      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md liquid-glass rounded-2xl border-0">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-3xl font-bold tracking-tight">MIT</span>
              <div className="w-px h-8 bg-foreground/30" />
              <span className="text-sm font-medium leading-tight text-left">Academy of<br />Engineering</span>
            </div>
            <CardTitle className="text-2xl">{mode === "login" ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription>
              {mode === "login" ? "Sign in to your classroom" : "Join MIT AOE Classrooms"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label>I am a</Label>
                    <Tabs value={role} onValueChange={(v) => setRole(v as "teacher" | "student")} className="mt-1">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="teacher" className="gap-1.5">
                          <GraduationCap className="w-4 h-4" /> Teacher
                        </TabsTrigger>
                        <TabsTrigger value="student" className="gap-1.5">
                          <Users className="w-4 h-4" /> Student
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
                  </div>
                  {role === "student" && (
                    <div>
                      <Label htmlFor="prn">PRN Number</Label>
                      <Input id="prn" value={prn} onChange={(e) => setPrn(e.target.value)} placeholder="Enter your PRN" required />
                    </div>
                  )}
                </>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
              </div>
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                {loading ? "Please wait..." : mode === "login" ? (
                  <><LogIn className="w-4 h-4" /> Sign In</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Create Account</>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              {mode === "login" ? (
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button className="text-primary font-medium hover:underline" onClick={() => setMode("signup")}>Sign up</button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <button className="text-primary font-medium hover:underline" onClick={() => setMode("login")}>Sign in</button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
