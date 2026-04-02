"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HeartHandshake, UserPlus, X, Check, Shield } from "lucide-react";

type PermissionLevel = "viewOnly" | "canMessage" | "canUpdate" | "fullAccess";

const permissionLabels: Record<PermissionLevel, { label: string; color: string }> = {
  viewOnly: { label: "View Only", color: "bg-slate-100 text-slate-700 border-slate-200" },
  canMessage: { label: "Can Message", color: "bg-blue-100 text-blue-700 border-blue-200" },
  canUpdate: { label: "Can Update", color: "bg-amber-100 text-amber-700 border-amber-200" },
  fullAccess: { label: "Full Access", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

function PermissionBadge({ level }: { level: PermissionLevel }) {
  const info = permissionLabels[level];
  return (
    <Badge variant="outline" className={cn("rounded-full text-xs", info.color)}>
      {info.label}
    </Badge>
  );
}

function CaregiversContent() {
  const account = useQuery(api.accounts.getCurrentAccount);
  const myCaregivers = useQuery(api.caregivers.getMyCaregivers);
  const myFamilies = useQuery(api.caregivers.getMyFamilies);
  const pendingInvites = useQuery(api.caregivers.getMyPendingInvites);

  const inviteCaregiver = useMutation(api.caregivers.inviteCaregiver);
  const acceptInvite = useMutation(api.caregivers.acceptInvite);
  const declineInvite = useMutation(api.caregivers.declineInvite);
  const updatePermissions = useMutation(api.caregivers.updateCaregiverPermissions);
  const removeCaregiver = useMutation(api.caregivers.removeCaregiver);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState<PermissionLevel>("viewOnly");
  const [isInviting, setIsInviting] = useState(false);

  if (account === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!account) return null;

  const isFamily = account.role === "family";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsInviting(true);
    try {
      await inviteCaregiver({
        email: inviteEmail.trim(),
        permissions: invitePermission,
      });
      toast.success("Caregiver invitation sent");
      setIsInviteOpen(false);
      setInviteEmail("");
      setInvitePermission("viewOnly");
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleAccept = async (caregiverId: Id<"caregivers">) => {
    try {
      await acceptInvite({ caregiverId });
      toast.success("Invitation accepted");
    } catch {
      toast.error("Failed to accept invitation");
    }
  };

  const handleDecline = async (caregiverId: Id<"caregivers">) => {
    try {
      await declineInvite({ caregiverId });
      toast.success("Invitation declined");
    } catch {
      toast.error("Failed to decline invitation");
    }
  };

  const handleUpdatePermissions = async (
    caregiverId: Id<"caregivers">,
    permissions: PermissionLevel
  ) => {
    try {
      await updatePermissions({ caregiverId, permissions });
      toast.success("Permissions updated");
    } catch {
      toast.error("Failed to update permissions");
    }
  };

  const handleRemove = async (caregiverId: Id<"caregivers">) => {
    try {
      await removeCaregiver({ caregiverId });
      toast.success("Caregiver removed");
    } catch {
      toast.error("Failed to remove caregiver");
    }
  };

  // Separate accepted and pending caregivers for family view
  const acceptedCaregivers = myCaregivers?.filter((c) => c.inviteStatus === "accepted") ?? [];
  const pendingSentInvites = myCaregivers?.filter((c) => c.inviteStatus === "pending") ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HeartHandshake className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Caregivers</h1>
            <p className="text-muted-foreground">
              {isFamily
                ? "Manage people who help care for your warriors"
                : "Families you provide care for"}
            </p>
          </div>
        </div>
        {isFamily && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Caregiver
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite a Caregiver</DialogTitle>
                <DialogDescription>
                  Send an invitation by email. They will be able to view and help
                  manage your warrior&apos;s care based on the permissions you set.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="caregiver@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Permission level</Label>
                  <Select
                    value={invitePermission}
                    onValueChange={(v) => setInvitePermission(v as PermissionLevel)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewOnly">View Only -- Can see warrior info</SelectItem>
                      <SelectItem value="canMessage">Can Message -- View + send messages</SelectItem>
                      <SelectItem value="canUpdate">Can Update -- View + edit warrior details</SelectItem>
                      <SelectItem value="fullAccess">Full Access -- All permissions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isInviting}>
                    {isInviting ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* ---- FAMILY VIEW ---- */}
      {isFamily && (
        <div className="space-y-8">
          {/* Pending Invites Sent */}
          {pendingSentInvites.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Pending Invitations</h2>
              <div className="space-y-3">
                {pendingSentInvites.map((invite) => (
                  <Card key={invite._id} className="border-amber-200">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-amber-100 text-amber-700 text-sm">
                              {(invite.inviteEmail?.[0] ?? "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{invite.inviteEmail}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="rounded-full text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Pending
                              </Badge>
                              <PermissionBadge level={invite.permissions as PermissionLevel} />
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRemove(invite._id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Active Caregivers */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Your Caregivers</h2>
            {myCaregivers === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border bg-card p-4 h-20" />
                ))}
              </div>
            ) : acceptedCaregivers.length > 0 ? (
              <div className="space-y-3">
                {acceptedCaregivers.map((caregiver) => (
                  <Card key={caregiver._id} className="border-emerald-200">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={caregiver.caregiverAccount?.profilePhoto} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {(caregiver.caregiverAccount?.name?.[0] ?? "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {caregiver.caregiverAccount?.name ?? "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {caregiver.caregiverAccount?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={caregiver.permissions}
                            onValueChange={(v) =>
                              handleUpdatePermissions(caregiver._id, v as PermissionLevel)
                            }
                          >
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewOnly">View Only</SelectItem>
                              <SelectItem value="canMessage">Can Message</SelectItem>
                              <SelectItem value="canUpdate">Can Update</SelectItem>
                              <SelectItem value="fullAccess">Full Access</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleRemove(caregiver._id)}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove caregiver</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <HeartHandshake className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-muted-foreground mb-2">No caregivers yet</p>
                  <p className="text-sm text-muted-foreground">
                    Invite someone you trust to help manage your warrior&apos;s care.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}

      {/* ---- CAREGIVER VIEW ---- */}
      {!isFamily && (
        <div className="space-y-8">
          {/* Pending Invites Received */}
          {pendingInvites !== undefined && pendingInvites.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Pending Invitations</h2>
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <Card key={invite._id} className="border-amber-200">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={invite.familyAccount?.profilePhoto} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {(invite.familyAccount?.name?.[0] ?? "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {invite.familyAccount?.name ?? "A family"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              invited you as a caregiver
                            </p>
                            <PermissionBadge level={invite.permissions as PermissionLevel} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(invite._id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDecline(invite._id)}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Families I care for */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Families You Care For</h2>
            {myFamilies === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border bg-card p-4 h-24" />
                ))}
              </div>
            ) : myFamilies.length > 0 ? (
              <div className="space-y-3">
                {myFamilies.map((family) => (
                  <Card key={family._id} className="border-primary/20">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={family.familyAccount?.profilePhoto} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {(family.familyAccount?.name?.[0] ?? "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {family.familyAccount?.name ?? "Unknown Family"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {family.familyAccount?.email}
                            </p>
                            {family.warriors && family.warriors.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {family.warriors.map((warrior) => (
                                  <Badge
                                    key={warrior._id}
                                    variant="secondary"
                                    className="rounded-full text-xs"
                                  >
                                    <Shield className="h-3 w-3 mr-1" />
                                    {warrior.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <PermissionBadge level={family.permissions as PermissionLevel} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <HeartHandshake className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-muted-foreground mb-2">No families yet</p>
                  <p className="text-sm text-muted-foreground">
                    When a family invites you as a caregiver, they will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default function CaregiversPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
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
