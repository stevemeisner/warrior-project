"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowLeft, MapPin, Shield, Check, Users, HeartHandshake } from "lucide-react";
import { geocodeCityState } from "@/lib/geocode";

type AccountRole = "family" | "caregiver";
type OnboardingStep = "role" | "warrior" | "location" | "done";

interface RoleOption {
  value: AccountRole;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const roleOptions: RoleOption[] = [
  {
    value: "family",
    title: "Family",
    description: "I have a warrior and want to connect with others",
    icon: <Users className="h-7 w-7 text-primary" strokeWidth={1.75} />,
  },
  {
    value: "caregiver",
    title: "Caregiver",
    description: "I help care for a warrior",
    icon: <HeartHandshake className="h-7 w-7 text-accent" strokeWidth={1.75} />,
  },
];

const STEPS_FAMILY: OnboardingStep[] = ["role", "warrior", "location", "done"];
const STEPS_CAREGIVER: OnboardingStep[] = ["role", "location", "done"];

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const authUser = useQuery(api.accounts.getAuthUserInfo);
  const existingAccount = useQuery(api.accounts.getCurrentAccount);
  const createAccount = useMutation(api.accounts.createAccount);
  const createWarrior = useMutation(api.warriors.createWarrior);
  const updateAccount = useMutation(api.accounts.updateAccount);
  const completeOnboarding = useMutation(api.accounts.completeOnboarding);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("role");
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  // Role chosen on the signup page; read in an effect so SSR and the first
  // client render agree.
  const [pendingRole, setPendingRole] = useState<AccountRole | null>(null);
  useEffect(() => {
    setPendingRole(sessionStorage.getItem("pendingRole") as AccountRole | null);
  }, []);

  // Warrior fields
  const [warriorName, setWarriorName] = useState("");
  const [warriorCondition, setWarriorCondition] = useState("");
  const [warriorBio, setWarriorBio] = useState("");

  // Location fields
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const isCreatingRef = useRef(false);
  // The resume-from-existing-account logic must run exactly once. Every
  // account write during the wizard (e.g. saving a location) re-emits
  // `existingAccount`; re-running it would throw the user back to step one.
  const initializedRef = useRef(false);

  // If account already exists: finished → dashboard, otherwise resume the wizard.
  useEffect(() => {
    if (existingAccount === undefined || initializedRef.current) return;
    if (!existingAccount) return;
    initializedRef.current = true;
    sessionStorage.removeItem("pendingRole");
    sessionStorage.removeItem("pendingAuthProvider");
    if (existingAccount.onboardingComplete) {
      router.push("/dashboard");
      return;
    }
    setAccountCreated(true);
    setSelectedRole(existingAccount.role as AccountRole);
    setCurrentStep(existingAccount.role === "family" ? "warrior" : "location");
  }, [existingAccount, router]);

  // Handle pending role from the signup page (email + Google flows both land here)
  useEffect(() => {
    if (authLoading || authUser === undefined || existingAccount === undefined) return;
    if (existingAccount) return; // Already handled above
    if (!isAuthenticated || !authUser) {
      router.push("/signup");
      return;
    }

    const role = sessionStorage.getItem("pendingRole") as AccountRole | null;
    if (role && !isCreatingRef.current) {
      isCreatingRef.current = true;
      handleCreateAccount(role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, authUser, existingAccount]);

  const handleCreateAccount = async (role: AccountRole) => {
    if (!authUser || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const pendingProvider = sessionStorage.getItem("pendingAuthProvider");
    const authProvider =
      pendingProvider === "google" || pendingProvider === "email"
        ? pendingProvider
        : authUser.image
          ? "google"
          : "email";

    try {
      await createAccount({
        email: authUser.email || "",
        name: authUser.name || authUser.email?.split("@")[0] || "User",
        role,
        authProvider,
        profilePhoto: authUser.image || undefined,
      });
      sessionStorage.removeItem("pendingRole");
      sessionStorage.removeItem("pendingAuthProvider");
      initializedRef.current = true;
      setAccountCreated(true);
      setSelectedRole(role);
      setCurrentStep(role === "family" ? "warrior" : "location");
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "";
      if (errMessage.includes("already exists")) {
        sessionStorage.removeItem("pendingRole");
        sessionStorage.removeItem("pendingAuthProvider");
        router.push("/dashboard");
      } else {
        setError("Failed to create account. Please try again.");
        setPendingRole(null);
        sessionStorage.removeItem("pendingRole");
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
      // Real coordinates put the family on the community map; if the place
      // can't be resolved we keep the text and the 0,0 "not on map" sentinel.
      const geocoded = await geocodeCityState(city, state);
      await updateAccount({
        location: geocoded ?? {
          latitude: 0,
          longitude: 0,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        },
      });
      setCurrentStep("done");
    } catch {
      setError("Failed to set location. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding();
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const steps = selectedRole === "family" ? STEPS_FAMILY : STEPS_CAREGIVER;
  const currentStepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  // Loading: auth token settling, queries in flight, or the account record
  // being auto-created from the role chosen on the signup page.
  const settingUp = existingAccount === null && !accountCreated && pendingRole !== null;
  if (authLoading || authUser === undefined || existingAccount === undefined || settingUp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {settingUp ? "Setting up your account…" : "Loading…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold text-primary">
              Warrior Project
            </span>
          </div>
        </div>

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
              {/* TODO: onboarding illustration — step 1 */}
              <CardTitle className="font-heading text-2xl">Welcome to Warrior Project</CardTitle>
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
                    "w-full p-4 rounded-xl border-2 text-left transition-all hover:border-primary disabled:opacity-50",
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
              {/* TODO: onboarding illustration — add warrior */}
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="font-heading">Add Your Warrior</CardTitle>
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
              {/* TODO: onboarding illustration — location */}
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle className="font-heading">Set Your Location</CardTitle>
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
              <CardTitle className="font-heading text-2xl">You&apos;re all set!</CardTitle>
              <CardDescription>
                {selectedRole === "family"
                  ? "Your account is ready. Start connecting with other families and caregivers."
                  : "Your account is ready. Connect with families who need your support."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleFinish} disabled={isSubmitting} className="w-full gap-2" size="lg">
                {isSubmitting ? "Opening your dashboard…" : "Go to Dashboard"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </Button>
              {error && (
                <p className="text-sm text-destructive text-center mt-3">{error}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
