"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, MapPin, Shield, Check } from "lucide-react";

type AccountRole = "family" | "caregiver";
type OnboardingStep = "role" | "warrior" | "location" | "done";

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

const STEPS_FAMILY: OnboardingStep[] = ["role", "warrior", "location", "done"];
const STEPS_CAREGIVER: OnboardingStep[] = ["role", "location", "done"];

export default function OnboardingPage() {
  const router = useRouter();
  const authUser = useQuery(api.accounts.getAuthUserInfo);
  const existingAccount = useQuery(api.accounts.getCurrentAccount);
  const createAccount = useMutation(api.accounts.createAccount);
  const createWarrior = useMutation(api.warriors.createWarrior);
  const updateAccount = useMutation(api.accounts.updateAccount);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("role");
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  // Warrior fields
  const [warriorName, setWarriorName] = useState("");
  const [warriorCondition, setWarriorCondition] = useState("");
  const [warriorBio, setWarriorBio] = useState("");

  // Location fields
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const isCreatingRef = useRef(false);

  // If account already exists and onboarding is complete, redirect
  useEffect(() => {
    if (existingAccount === undefined) return;
    if (existingAccount?.onboardingComplete) {
      router.push("/dashboard");
      return;
    }
    // If account exists but onboarding not complete, resume where they left off
    if (existingAccount && !existingAccount.onboardingComplete) {
      setAccountCreated(true);
      setSelectedRole(existingAccount.role as AccountRole);
      if (existingAccount.role === "family") {
        setCurrentStep("warrior");
      } else {
        setCurrentStep("location");
      }
    }
  }, [existingAccount, router]);

  // Handle pending role from signup page (for auto-creation via Google OAuth)
  useEffect(() => {
    if (authUser === undefined || existingAccount === undefined) return;
    if (existingAccount) return; // Already handled above
    if (!authUser) {
      router.push("/signup");
      return;
    }

    const pendingRole = sessionStorage.getItem("pendingRole") as AccountRole | null;
    if (pendingRole && !isCreatingRef.current) {
      isCreatingRef.current = true;
      handleCreateAccount(pendingRole);
    }
  }, [authUser, existingAccount]);

  const handleCreateAccount = async (role: AccountRole) => {
    if (!authUser || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await createAccount({
        email: authUser.email || "",
        name: authUser.name || authUser.email?.split("@")[0] || "User",
        role,
        authProvider: authUser.image ? "google" : "email",
        profilePhoto: authUser.image || undefined,
      });
      sessionStorage.removeItem("pendingRole");
      setAccountCreated(true);
      setSelectedRole(role);

      // Move to next step
      if (role === "family") {
        setCurrentStep("warrior");
      } else {
        setCurrentStep("location");
      }
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "";
      if (errMessage.includes("already exists")) {
        sessionStorage.removeItem("pendingRole");
        router.push("/dashboard");
      } else {
        setError("Failed to create account. Please try again.");
        isCreatingRef.current = false;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = (role: AccountRole) => {
    setSelectedRole(role);
    handleCreateAccount(role);
  };

  const handleAddWarrior = async () => {
    if (!warriorName.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await createWarrior({
        name: warriorName.trim(),
        condition: warriorCondition.trim() || undefined,
        bio: warriorBio.trim() || undefined,
      });
      setCurrentStep("location");
    } catch (err) {
      setError("Failed to add warrior. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipWarrior = () => {
    setCurrentStep("location");
  };

  const handleSetLocation = async () => {
    if (!city.trim() && !state.trim()) {
      // Skip location, go to done
      setCurrentStep("done");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateAccount({
        location: {
          latitude: 0,
          longitude: 0,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        },
      });
      setCurrentStep("done");
    } catch (err) {
      setError("Failed to set location. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  const steps = selectedRole === "family" ? STEPS_FAMILY : STEPS_CAREGIVER;
  const currentStepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  // Loading state
  if (authUser === undefined || existingAccount === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        {currentStep !== "role" && (
          <div className="flex items-center gap-2 mb-6 px-2">
            {steps.map((step, i) => (
              <div
                key={step}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-colors",
                  i <= currentStepIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        )}

        {/* Step: Role Selection */}
        {currentStep === "role" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to Warrior Project</CardTitle>
              <CardDescription>
                How would you like to be part of our community?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRoleSelect(option.value)}
                  disabled={isSubmitting}
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
        )}

        {/* Step: Add First Warrior (Family only) */}
        {currentStep === "warrior" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Add Your Warrior</CardTitle>
              </div>
              <CardDescription>
                Tell us about your warrior. You can add more later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="warriorName">Name *</Label>
                <Input
                  id="warriorName"
                  value={warriorName}
                  onChange={(e) => setWarriorName(e.target.value)}
                  placeholder="Your warrior's name"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warriorCondition">Condition / Diagnosis</Label>
                <Input
                  id="warriorCondition"
                  value={warriorCondition}
                  onChange={(e) => setWarriorCondition(e.target.value)}
                  placeholder="e.g., CHD, Cancer, Autism"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warriorBio">About</Label>
                <Textarea
                  id="warriorBio"
                  value={warriorBio}
                  onChange={(e) => setWarriorBio(e.target.value)}
                  placeholder="Share a little about your warrior..."
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={handleSkipWarrior}
                  disabled={isSubmitting}
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleAddWarrior}
                  disabled={isSubmitting || !warriorName.trim()}
                  className="flex-1 gap-2"
                >
                  {isSubmitting ? "Adding..." : "Add Warrior"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Set Location */}
        {currentStep === "location" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Set Your Location</CardTitle>
              </div>
              <CardDescription>
                Help other families and caregivers find you on the map. This is optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep("done")}
                  disabled={isSubmitting}
                >
                  Skip
                </Button>
                <Button
                  onClick={handleSetLocation}
                  disabled={isSubmitting}
                  className="flex-1 gap-2"
                >
                  {isSubmitting ? "Saving..." : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {currentStep === "done" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
              <CardDescription>
                {selectedRole === "family"
                  ? "Your account is ready. Start connecting with other families and caregivers."
                  : "Your account is ready. Connect with families who need your support."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleFinish} className="w-full gap-2" size="lg">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
