import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).optional(),
});

const mentorLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  specialKey: z.string().min(1, "Special key is required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"student" | "mentor">("student");

  // Student forms
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentFullName, setStudentFullName] = useState("");

  // Mentor form
  const [mentorEmail, setMentorEmail] = useState("");
  const [mentorPassword, setMentorPassword] = useState("");
  const [specialKey, setSpecialKey] = useState("");

  const handleStudentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email: studentEmail, password: studentPassword, fullName: studentFullName });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: studentEmail,
      password: studentPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: studentFullName,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created successfully! Please sign in.");
      setActiveTab("student");
    }
  };

  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email: studentEmail, password: studentPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: studentEmail,
      password: studentPassword,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in successfully!");
      navigate("/");
    }
  };

  const handleMentorSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      mentorLoginSchema.parse({ email: mentorEmail, password: mentorPassword, specialKey });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    // Verify special key
    if (specialKey !== "Mentor2026@REC") {
      toast.error("Invalid special key");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: mentorEmail,
      password: mentorPassword,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in as mentor!");
      navigate("/mentor/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to PlacementSphere</CardTitle>
          <CardDescription>
            Campus Recruitment Resource Portal for Batch 2027
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "student" | "mentor")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="mentor">Mentor</TabsTrigger>
            </TabsList>

            <TabsContent value="student">
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleStudentSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student-signin-email">Email</Label>
                      <Input
                        id="student-signin-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-signin-password">Password</Label>
                      <Input
                        id="student-signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleStudentSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student-signup-name">Full Name</Label>
                      <Input
                        id="student-signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={studentFullName}
                        onChange={(e) => setStudentFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-signup-email">Email</Label>
                      <Input
                        id="student-signup-email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-signup-password">Password</Label>
                      <Input
                        id="student-signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign Up
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="mentor">
              <form onSubmit={handleMentorSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mentor-email">Email</Label>
                  <Input
                    id="mentor-email"
                    type="email"
                    placeholder="mentor@example.com"
                    value={mentorEmail}
                    onChange={(e) => setMentorEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mentor-password">Password</Label>
                  <Input
                    id="mentor-password"
                    type="password"
                    placeholder="••••••••"
                    value={mentorPassword}
                    onChange={(e) => setMentorPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="special-key">Special Key</Label>
                  <Input
                    id="special-key"
                    type="password"
                    placeholder="Enter mentor special key"
                    value={specialKey}
                    onChange={(e) => setSpecialKey(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In as Mentor
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;