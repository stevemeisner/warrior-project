"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { GradientHeader, ContentPanel } from "@/components/gradient-header";

type PermissionLevel = "viewOnly" | "canMessage" | "canUpdate" | "fullAccess";

const permissionLabels: Record<PermissionLevel, string> = {
  viewOnly: "View Only",
  canMessage: "Can Message",
  canUpdate: "Can Update Status",
  fullAccess: "Full Access",
};

const permissionDescriptions: Record<PermissionLevel, string> = {
  viewOnly: "Can view warriors and status updates",
  canMessage: "Can view and send messages",
  canUpdate: "Can update warrior status",
  fullAccess: "Full access to manage warriors",
};

function CaregiversContent() {
  const account = useQuery(api.accounts.getCurrentAccount);
  const caregivers = useQuery(api.caregivers.getMyCaregivers);
  const pendingInvites = useQuery(api.caregivers.getMyPendingInvites);

  const inviteCaregiver = useMutation(api.caregivers.inviteCaregiver);
  const updatePermissions = useMutation(api.caregivers.updateCaregiverPermissions);
  const removeCaregiver = useMutation(api.caregivers.removeCaregiver);
  const acceptInvite = useMutation(api.caregivers.acceptInvite);
  const declineInvite = useMutation(api.caregivers.declineInvite);

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<PermissionLevel>("viewOnly");
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await inviteCaregiver({
        email: inviteEmail.trim(),
        permissions: invitePermissions,
      });
      toast.success("Invitation sent");
      setInviteEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdatePermissions = async (caregiverId: string, permissions: PermissionLevel) => {
    try {
      await updatePermissions({
        caregiverId: caregiverId as any,
        permissions,
      });
      toast.success("Permissions updated");
    } catch (error) {
      toast.error("Failed to update permissions");
    }
  };

  const handleRemove = async (caregiverId: string) => {
    try {
      await removeCaregiver({ caregiverId: caregiverId as any });
      toast.success("Caregiver removed");
    } catch (error) {
      toast.error("Failed to remove caregiver");
    }
  };

  const handleAcceptInvite = async (caregiverId: string) => {
    try {
      await acceptInvite({ caregiverId: caregiverId as any });
      toast.success("Invitation accepted");
    } catch (error) {
      toast.error("Failed to accept invitation");
    }
  };

  const handleDeclineInvite = async (caregiverId: string) => {
    try {
      await declineInvite({ caregiverId: caregiverId as any });
      toast.success("Invitation declined");
    } catch (error) {
      toast.error("Failed to decline invitation");
    }
  };

  // Loading state
  if (account === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
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

  const isFamily = account.role === "family";

  return (
    <>
      <GradientHeader>
        <div className="pb-2">
          <p className="section-label opacity-80 mb-1">
            <Link href="/profile" className="text-white/80 hover:text-white">
              &larr; Back to Profile
            </Link>
          </p>
          <h1 className="font-heading text-2xl font-semibold text-white">
            {isFamily ? "Manage Caregivers" : "Caregiver Invitations"}
          </h1>
        </div>
      </GradientHeader>

      <ContentPanel>
        {/* Pending Invites - For caregivers */}
        {!isFamily && pendingInvites && pendingInvites.length > 0 && (
          <Card className="mb-6 rounded-2xl">
            <CardHeader>
              <CardTitle className="section-label">Pending Invitations</CardTitle>
              <CardDescription>
                Families have invited you to be a caregiver
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingInvites.map((invite) => (
                <div
                  key={invite._id}
                  className="flex items-center justify-between p-4 rounded-2xl border"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={invite.familyAccount?.profilePhoto} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-heading font-semibold">
                        {invite.familyAccount?.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-heading font-semibold">{invite.familyAccount?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {permissionLabels[invite.permissions as PermissionLevel]} access
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineInvite(invite._id.toString())}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvite(invite._id.toString())}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Invite Form - Family only */}
        {isFamily && (
          <Card className="mb-6 rounded-2xl">
            <CardHeader>
              <CardTitle className="section-label">Invite a Caregiver</CardTitle>
              <CardDescription>
                Invite someone to help care for your warriors by entering their email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="caregiver@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isInviting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permissions">Permission Level</Label>
                  <Select
                    value={invitePermissions}
                    onValueChange={(value) => setInvitePermissions(value as PermissionLevel)}
                    disabled={isInviting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(permissionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div>
                            <p>{label}</p>
                            <p className="text-xs text-muted-foreground">
                              {permissionDescriptions[value as PermissionLevel]}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Current Caregivers - Family only */}
        {isFamily && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="section-label">Your Caregivers</CardTitle>
              <CardDescription>
                Manage caregivers who help with your warriors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {caregivers && caregivers.length > 0 ? (
                <div className="space-y-4">
                  {caregivers.map((cg) => (
                    <div
                      key={cg._id}
                      className="flex items-center justify-between p-4 rounded-2xl border"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={cg.caregiverAccount?.profilePhoto} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-heading font-semibold">
                            {cg.caregiverAccount?.name?.[0] || cg.inviteEmail?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-heading font-semibold">
                            {cg.caregiverAccount?.name || cg.inviteEmail}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={cg.inviteStatus === "accepted" ? "default" : "secondary"}
                            >
                              {cg.inviteStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {cg.inviteStatus === "accepted" && (
                          <Select
                            value={cg.permissions}
                            onValueChange={(value) =>
                              handleUpdatePermissions(cg._id.toString(), value as PermissionLevel)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(permissionLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Caregiver</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove{" "}
                                {cg.caregiverAccount?.name || cg.inviteEmail} as a caregiver?
                                They will no longer have access to your warriors.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemove(cg._id.toString())}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">No caregivers yet</p>
                  <p className="text-sm text-muted-foreground">
                    Use the form above to invite someone to help care for your warriors.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* No content for caregivers without pending invites */}
        {!isFamily && (!pendingInvites || pendingInvites.length === 0) && (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-2">No pending invitations</p>
              <p className="text-sm text-muted-foreground">
                When families invite you to be a caregiver, you&apos;ll see their invitations here.
              </p>
            </CardContent>
          </Card>
        )}
      </ContentPanel>
    </>
  );
}

export default function CaregiversPage() {
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
        <CaregiversContent />
      </Authenticated>
    </>
  );
}
