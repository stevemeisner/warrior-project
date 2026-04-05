"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { WarriorList } from "@/components/warrior-card";
import { useRouter } from "next/navigation";
import { GradientHeader, ContentPanel } from "@/components/gradient-header";

function ProfileContent() {
  const router = useRouter();
  const account = useQuery(api.accounts.getCurrentAccount);
  const warriors = useQuery(api.warriors.getMyWarriors);
  const caregivers = useQuery(api.caregivers.getMyCaregivers);
  const families = useQuery(api.caregivers.getMyFamilies);

  const updateAccount = useMutation(api.accounts.updateAccount);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setName(account?.name || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAccount({ name: name.trim() || undefined });
      toast.success("Profile updated");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (account === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // No account
  if (account === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Account not found</p>
          <Link href="/signup">
            <Button>Sign Up</Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = account.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isFamily = account.role === "family";

  return (
    <>
      <GradientHeader>
        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="section-label opacity-80 mb-1">Your Account</p>
            <h1 className="font-heading text-2xl font-semibold text-white">{account.name}</h1>
          </div>
          <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
            {account.profilePhoto ? (
              <img src={account.profilePhoto} alt={account.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-white text-xl font-semibold font-heading">{initials}</span>
            )}
          </div>
        </div>
      </GradientHeader>

      <ContentPanel>
        {/* Account Information */}
        <Card className="mb-6 rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="section-label">Account Information</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={account.profilePhoto} alt={account.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl font-heading font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-muted-foreground text-sm">Name</Label>
                      <p className="text-lg font-heading font-semibold">{account.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Email</Label>
                      <p>{account.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Role</Label>
                      <p className="capitalize">{account.role}</p>
                    </div>
                    {account.location && (
                      <div>
                        <Label className="text-muted-foreground text-sm">Location</Label>
                        <p>
                          {account.location.city}
                          {account.location.state && `, ${account.location.state}`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warriors Section - Family only */}
        {isFamily && (
          <Card className="mb-6 rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="section-label">My Warriors</CardTitle>
                <Link href="/profile/warrior/new">
                  <Button size="sm">Add Warrior</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <WarriorList
                warriors={(warriors || []).map((w) => ({
                  ...w,
                  _id: w._id.toString(),
                }))}
                onWarriorClick={(warrior) =>
                  router.push(`/profile/warrior/${warrior._id}`)
                }
                compact
              />
            </CardContent>
          </Card>
        )}

        {/* Caregivers Section - Family only */}
        {isFamily && (
          <Card className="mb-6 rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="section-label">My Caregivers</CardTitle>
                <Link href="/caregivers">
                  <Button size="sm" variant="outline">
                    Manage Caregivers
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {caregivers && caregivers.length > 0 ? (
                <div className="space-y-3">
                  {caregivers.map((cg) => (
                    <div
                      key={cg._id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={cg.caregiverAccount?.profilePhoto} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-heading font-semibold">
                            {cg.caregiverAccount?.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-heading font-semibold">
                            {cg.caregiverAccount?.name || cg.inviteEmail}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {cg.permissions.replace(/([A-Z])/g, " $1").trim()} |{" "}
                            {cg.inviteStatus}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No caregivers yet. Invite someone to help care for your warriors.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Families Section - Caregiver only */}
        {!isFamily && (
          <Card className="mb-6 rounded-2xl">
            <CardHeader>
              <CardTitle className="section-label">Families I Care For</CardTitle>
            </CardHeader>
            <CardContent>
              {families && families.length > 0 ? (
                <div className="space-y-3">
                  {families.map((fam) => (
                    <div
                      key={fam._id}
                      className="p-4 rounded-2xl bg-muted/50"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={fam.familyAccount?.profilePhoto} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-heading font-semibold">
                            {fam.familyAccount?.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-heading font-semibold">{fam.familyAccount?.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {fam.permissions.replace(/([A-Z])/g, " $1").trim()} access
                          </p>
                        </div>
                      </div>
                      {fam.warriors && fam.warriors.length > 0 && (
                        <div className="pl-13">
                          <p className="text-sm font-medium mb-2">Warriors:</p>
                          <WarriorList
                            warriors={fam.warriors.map((w) => ({
                              ...w,
                              _id: w._id.toString(),
                            }))}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  You haven&apos;t been added as a caregiver for any families yet.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </ContentPanel>
    </>
  );
}

export default function ProfilePage() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <Link href="/signin">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ProfileContent />
      </Authenticated>
    </>
  );
}
