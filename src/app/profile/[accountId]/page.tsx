"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { WarriorList } from "@/components/warrior-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { WarriorStatus } from "@/components/status-selector";

function PublicProfileContent() {
  const params = useParams();
  const accountId = params.accountId as string;

  const account = useQuery(api.accounts.getAccount, { accountId: accountId as any });
  const currentUser = useQuery(api.accounts.getCurrentAccount);
  const warriors = useQuery(api.warriors.getWarriorsByAccount, { accountId: accountId as any });

  // Loading state
  if (account === undefined || warriors === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (account === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profile not found</h2>
          <Link href="/map">
            <Button>Back to Map</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if viewing own profile
  const isOwnProfile = currentUser && currentUser._id === account._id;

  if (isOwnProfile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">This is your profile.</p>
        <Link href="/profile">
          <Button>Go to My Profile</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Link href="/map" className="text-primary hover:underline">
          &larr; Back to Map
        </Link>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={account.profilePhoto} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {account.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{account.name}</h1>
              <p className="text-muted-foreground capitalize">{account.role}</p>
              {'privacySettings' in account && account.privacySettings?.showLocation && account.location && (
                <p className="text-sm text-muted-foreground mt-1">
                  📍 {account.location.city}
                  {account.location.state && `, ${account.location.state}`}
                </p>
              )}
            </div>
            <Link href={`/messages?to=${account._id}`}>
              <Button>Send Message</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Warriors */}
      {warriors && warriors.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Warriors</h2>
          <WarriorList
            warriors={warriors.map((w) => ({
              ...w,
              _id: w._id.toString(),
            }))}
            onWarriorClick={(warrior) => {
              // Navigate to warrior detail page
              window.location.href = `/profile/warrior/${warrior._id}`;
            }}
          />
        </section>
      )}

      {warriors && warriors.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No public warriors to display.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PublicProfilePage() {
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
        <PublicProfileContent />
      </Authenticated>
    </div>
  );
}
