"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function OnboardingPage() {
  const router = useRouter();
  const authUser = useQuery(api.accounts.getAuthUserInfo);
  const existingAccount = useQuery(api.accounts.getCurrentAccount);
  const createAccount = useMutation(api.accounts.createAccount);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);

  // Use ref to track creation state without triggering re-renders
  const isCreatingRef = useRef(false);

  useEffect(() => {
    async function handleOnboarding() {
      // Wait for queries to load
      if (authUser === undefined || existingAccount === undefined) {
        return;
      }

      // If account already exists, redirect to dashboard
      if (existingAccount) {
        sessionStorage.removeItem("pendingRole");
        router.push("/dashboard");
        return;
      }

      // If no auth user, redirect to signup
      if (!authUser) {
        router.push("/signup");
        return;
      }

      // Get the pending role from session storage
      const pendingRole = sessionStorage.getItem("pendingRole") as "family" | "caregiver" | null;
      if (!pendingRole) {
        // No role stored - show role selection UI instead of redirecting
        setShowRoleSelection(true);
        return;
      }

      // Create the account (use ref to prevent double creation)
      if (!isCreatingRef.current) {
        isCreatingRef.current = true;
        setIsCreating(true);
        try {
          await createAccount({
            email: authUser.email || "",
            name: authUser.name || authUser.email?.split("@")[0] || "User",
            role: pendingRole,
            authProvider: "google",
            profilePhoto: authUser.image || undefined,
          });
          sessionStorage.removeItem("pendingRole");
          router.push("/dashboard");
        } catch (err) {
          const errMessage = err instanceof Error ? err.message : "";
          if (errMessage.includes("already exists")) {
            // Account was created by another process, redirect to dashboard
            sessionStorage.removeItem("pendingRole");
            router.push("/dashboard");
          } else {
            setError("Failed to complete account setup. Please try again.");
            isCreatingRef.current = false;
            setIsCreating(false);
          }
        }
      }
    }

    handleOnboarding();
  }, [authUser, existingAccount, createAccount, router]);

  const handleRoleSelect = async (role: AccountRole) => {
    if (!authUser || isCreating) return;

    setSelectedRole(role);
    setIsCreating(true);
    setError(null);

    try {
      await createAccount({
        email: authUser.email || "",
        name: authUser.name || authUser.email?.split("@")[0] || "User",
        role,
        authProvider: authUser.image ? "google" : "email",
        profilePhoto: authUser.image || undefined,
      });
      router.push("/dashboard");
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "";
      if (errMessage.includes("already exists")) {
        router.push("/dashboard");
      } else {
        setError("Failed to complete account setup. Please try again.");
        setIsCreating(false);
        setSelectedRole(null);
      }
    }
  };

  // Show role selection UI for users who need to choose a role
  if (showRoleSelection && !isCreating) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              How would you like to be part of our community?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRoleSelect(option.value)}
                disabled={isCreating}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all hover:border-primary disabled:opacity-50",
                  selectedRole === option.value ? "border-primary bg-primary/5" : "border-border"
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
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/signup")}
            className="text-primary hover:underline"
          >
            Return to Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    </div>
  );
}
