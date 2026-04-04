import { SignInForm } from "@/components/auth/sign-in-form";
import { Shield } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold text-primary">
              Warrior Project
            </span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Connecting families and caregivers
          </p>
        </div>

        <SignInForm />
      </div>
    </div>
  );
}
