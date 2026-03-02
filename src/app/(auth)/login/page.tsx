"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mic } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedEmail = email.trim();

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push("/onboarding");
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">
            FieldTicket
          </CardTitle>
        </div>
        <p className="text-muted-foreground text-base">
          Voice-first field tickets for the oilfield
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                className="h-12 text-base"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 text-base"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-orange-400 transition-colors"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
