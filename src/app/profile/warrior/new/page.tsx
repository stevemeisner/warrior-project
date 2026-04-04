"use client";

import { WarriorForm } from "@/components/warrior-form";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GradientHeader, ContentPanel } from "@/components/gradient-header";

export default function NewWarriorPage() {
  return (
    <>
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
        <GradientHeader>
          <div className="pb-2">
            <p className="section-label opacity-80 mb-1">
              <Link href="/profile" className="text-white/80 hover:text-white">
                &larr; Back to Profile
              </Link>
            </p>
            <h1 className="font-heading text-2xl font-semibold text-white">Add a Warrior</h1>
          </div>
        </GradientHeader>
        <ContentPanel>
          <WarriorForm />
        </ContentPanel>
      </Authenticated>
    </>
  );
}
