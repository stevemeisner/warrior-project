import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Warrior Project</h1>
          <p className="text-muted-foreground mt-2">
            Connecting families and caregivers
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
