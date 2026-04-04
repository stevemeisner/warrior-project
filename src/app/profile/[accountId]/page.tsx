"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { WarriorList } from "@/components/warrior-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { WarriorStatus } from "@/components/status-selector";
import { toast } from "sonner";
import { GradientHeader, ContentPanel } from "@/components/gradient-header";

function PublicProfileContent() {
  const params = useParams();
  const accountId = params.accountId as string;

  const account = useQuery(api.accounts.getAccount, { accountId: accountId as any });
  const currentUser = useQuery(api.accounts.getCurrentAccount);
  const warriors = useQuery(api.warriors.getWarriorsByAccount, { accountId: accountId as any });
  const blockStatus = useQuery(api.blockedUsers.getBlockStatus, { accountId: accountId as any });
  const blockUser = useMutation(api.blockedUsers.blockUser);
  const unblockUser = useMutation(api.blockedUsers.unblockUser);
  const isBlockedByMe = blockStatus?.blockedByMe ?? false;
  const isBlockedByThem = blockStatus?.blockedByThem ?? false;
  const isAnyBlock = isBlockedByMe || isBlockedByThem;

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

  const initials = account.name?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <GradientHeader>
        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="section-label opacity-80 mb-1">
              <Link href="/map" className="text-white/80 hover:text-white">
                &larr; Back to Map
              </Link>
            </p>
            <h1 className="font-heading text-2xl font-semibold text-white">{account.name}</h1>
            <p className="text-white/70 capitalize mt-0.5">{account.role}</p>
          </div>
          <Avatar className="h-14 w-14 border-2 border-white/30">
            <AvatarImage src={account.profilePhoto} />
            <AvatarFallback className="bg-white/20 text-white text-xl font-heading font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </GradientHeader>

      <ContentPanel>
        {/* Profile Header Card */}
        <Card className="mb-6 rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={account.profilePhoto} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl font-heading font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-heading font-semibold">{account.name}</h2>
                <p className="text-muted-foreground capitalize">{account.role}</p>
                {'privacySettings' in account && account.privacySettings?.showLocation && account.location && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {account.location.city}
                    {account.location.state && `, ${account.location.state}`}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                {!isAnyBlock && (
                  <Link href={`/messages?to=${account._id}`}>
                    <Button size="sm">Send Message</Button>
                  </Link>
                )}
                {isBlockedByThem && !isBlockedByMe && (
                  <p className="text-sm text-muted-foreground">
                    Not accepting messages
                  </p>
                )}
                <Button
                  variant={isBlockedByMe ? "outline" : "ghost"}
                  size="sm"
                  className={isBlockedByMe ? "text-destructive border-destructive" : "text-muted-foreground"}
                  onClick={async () => {
                    try {
                      if (isBlockedByMe) {
                        await unblockUser({ accountId: accountId as any });
                        toast.success("User unblocked");
                      } else {
                        await blockUser({ accountId: accountId as any });
                        toast.success("User blocked");
                      }
                    } catch (error) {
                      toast.error("Failed to update block status");
                    }
                  }}
                >
                  {isBlockedByMe ? "Unblock" : "Block"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warriors */}
        {warriors && warriors.length > 0 && (
          <section>
            <p className="section-label mb-4">Warriors</p>
            <WarriorList
              warriors={warriors.map((w) => ({
                ...w,
                _id: w._id.toString(),
              }))}
              onWarriorClick={(warrior) => {
                window.location.href = `/profile/warrior/${warrior._id}`;
              }}
            />
          </section>
        )}

        {warriors && warriors.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No public warriors to display.
              </p>
            </CardContent>
          </Card>
        )}
      </ContentPanel>
    </>
  );
}

export default function PublicProfilePage() {
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
        <PublicProfileContent />
      </Authenticated>
    </>
  );
}
