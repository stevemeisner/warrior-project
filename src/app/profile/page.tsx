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

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p>Loading...</p>
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      {/* Profile Info */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account Information</CardTitle>
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
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
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
                    <p className="text-lg font-medium">{account.name}</p>
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
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Warriors</CardTitle>
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
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Caregivers</CardTitle>
              <Link href="/profile/caregivers">
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
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={cg.caregiverAccount?.profilePhoto} />
                        <AvatarFallback>
                          {cg.caregiverAccount?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Families I Care For</CardTitle>
          </CardHeader>
          <CardContent>
            {families && families.length > 0 ? (
              <div className="space-y-3">
                {families.map((fam) => (
                  <div
                    key={fam._id}
                    className="p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={fam.familyAccount?.profilePhoto} />
                        <AvatarFallback>
                          {fam.familyAccount?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{fam.familyAccount?.name}</p>
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
    </div>
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
