"use client";

import { WarriorForm } from "@/components/warrior-form";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewWarriorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AuthLoading>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p>Loading...</p>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <Link href="/signin">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <div className="mb-6">
          <Link href="/dashboard" className="text-primary hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>
        <WarriorForm />
      </Authenticated>
    </div>
  );
}
