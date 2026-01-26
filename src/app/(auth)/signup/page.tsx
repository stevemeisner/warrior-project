import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Warrior Project</h1>
          <p className="text-muted-foreground mt-2">
            Join our supportive community
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
