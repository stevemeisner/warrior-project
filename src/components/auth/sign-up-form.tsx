"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AccountRole = "family" | "caregiver";

interface RoleOption {
  value: AccountRole;
  title: string;
  description: string;
  icon: string;
}

const roleOptions: RoleOption[] = [
  {
    value: "family",
    title: "Family",
    description: "I have a warrior and want to connect with others",
    icon: "👨‍👩‍👧",
  },
  {
    value: "caregiver",
    title: "Caregiver",
    description: "I help care for a warrior",
    icon: "💝",
  },
];

export function SignUpForm() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const createAccount = useMutation(api.accounts.createAccount);
  const [step, setStep] = useState<"role" | "details">("role");
  const [role, setRole] = useState<AccountRole | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (selectedRole: AccountRole) => {
    setRole(selectedRole);
    setStep("details");
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      await signIn("password", {
        email,
        password,
        name,
        role,
        flow: "signUp",
      });

      // Create the account record after successful signup
      try {
        await createAccount({
          email,
          name,
          role: role!,
          authProvider: "email",
        });
      } catch (accountErr) {
        // Account may already exist (created by callback), ignore this error
        const errMessage = accountErr instanceof Error ? accountErr.message : "";
        if (!errMessage.includes("already exists")) {
          console.error("Failed to create account record:", accountErr);
        }
      }

      // Redirect to dashboard after successful signup
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to create account. This email may already be registered.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!role) {
      setError("Please select a role first");
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      // Store role in session for after OAuth redirect
      sessionStorage.setItem("pendingRole", role);
      await signIn("google", { redirectTo: "/onboarding" });
    } catch (err) {
      setError("Failed to sign up with Google");
      setIsLoading(false);
    }
  };

  if (step === "role") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl">Join Warrior Project</CardTitle>
          <CardDescription>
            How would you like to be part of our community?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleRoleSelect(option.value)}
              className={cn(
                "w-full p-4 rounded-lg border-2 text-left transition-all hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                role === option.value ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{option.icon}</span>
                <div>
                  <h3 className="font-semibold">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}

          <p className="text-center text-sm text-muted-foreground pt-4">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
        <CardDescription>
          Joining as {role === "family" ? "a Family" : "a Caregiver"}
          <button
            onClick={() => setStep("role")}
            className="ml-2 text-primary hover:underline"
          >
            Change
          </button>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignUp}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div aria-live="polite" aria-atomic="true">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
