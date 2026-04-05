"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { WarriorForm } from "@/components/warrior-form";
import { StatusSelector, StatusBadge, WarriorStatus } from "@/components/status-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
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
import { GradientHeader, ContentPanel } from "@/components/gradient-header";

function WarriorDetailContent() {
  const params = useParams();
  const router = useRouter();
  const warriorId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const warrior = useQuery(api.warriors.getWarrior, { warriorId: warriorId as any });
  const account = useQuery(api.accounts.getCurrentAccount);
  const statusHistory = useQuery(api.status.getStatusHistory, {
    warriorId: warriorId as any,
    limit: 20,
  });

  const updateStatus = useMutation(api.status.updateStatus);
  const deleteWarrior = useMutation(api.warriors.deleteWarrior);

  // Loading state
  if (warrior === undefined || account === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading warrior...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (warrior === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Warrior not found</h2>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is owner
  const isOwner = account && warrior.accountId === account._id;

  const handleStatusChange = async (status: WarriorStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateStatus({
        warriorId: warriorId as any,
        status,
      });
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWarrior({ warriorId: warriorId as any });
      toast.success("Warrior deleted");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Failed to delete warrior");
      console.error(error);
    }
  };

  if (isEditing) {
    return (
      <>
        <GradientHeader>
          <div className="pb-2">
            <p className="section-label opacity-80 mb-1">
              <button
                onClick={() => setIsEditing(false)}
                className="text-white/80 hover:text-white"
              >
                &larr; Cancel editing
              </button>
            </p>
            <h1 className="font-heading text-2xl font-semibold text-white">Edit {warrior.name}</h1>
          </div>
        </GradientHeader>
        <ContentPanel>
          <WarriorForm
            warrior={{
              _id: warrior._id,
              name: warrior.name,
              dateOfBirth: warrior.dateOfBirth,
              condition: warrior.condition,
              bio: warrior.bio,
              visibility: warrior.visibility,
            }}
            onSuccess={() => setIsEditing(false)}
          />
        </ContentPanel>
      </>
    );
  }

  return (
    <>
      <GradientHeader>
        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="section-label opacity-80 mb-1">
              <Link href="/dashboard" className="text-white/80 hover:text-white">
                &larr; Back to Dashboard
              </Link>
            </p>
            <h1 className="font-heading text-2xl font-semibold text-white">{warrior.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={warrior.currentStatus as WarriorStatus} size="lg" />
          </div>
        </div>
      </GradientHeader>

      <ContentPanel>
        <div className="space-y-6">
          {/* Warrior Info */}
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading font-semibold text-xl">{warrior.name}</CardTitle>
              <StatusBadge status={warrior.currentStatus as WarriorStatus} size="lg" />
            </CardHeader>
            <CardContent className="space-y-4">
              {warrior.condition && (
                <div>
                  <span className="text-sm text-muted-foreground">Condition:</span>
                  <p className="font-medium">{warrior.condition}</p>
                </div>
              )}
              {warrior.dateOfBirth && (
                <div>
                  <span className="text-sm text-muted-foreground">Date of Birth:</span>
                  <p className="font-medium">{new Date(warrior.dateOfBirth).toLocaleDateString()}</p>
                </div>
              )}
              {warrior.bio && (
                <div>
                  <span className="text-sm text-muted-foreground">About:</span>
                  <p className="mt-1">{warrior.bio}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground">Visibility:</span>
                <p className="font-medium capitalize">{warrior.visibility}</p>
              </div>

              {isOwner && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={() => setIsEditing(true)}>Edit Warrior</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete warrior?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this warrior and all associated status updates. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Update (for owners) */}
          {isOwner && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="section-label">Update Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusSelector
                  currentStatus={warrior.currentStatus as WarriorStatus}
                  onStatusChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                />
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="section-label">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              {statusHistory === undefined ? (
                <p className="text-muted-foreground">Loading history...</p>
              ) : statusHistory.length > 0 ? (
                <ul className="space-y-3">
                  {statusHistory.map((update) => (
                    <li
                      key={update._id}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-muted/50"
                    >
                      <StatusBadge
                        status={update.status as WarriorStatus}
                        showLabel={false}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-semibold capitalize">{update.status}</span>
                          <span className="text-xs text-muted-foreground">
                            by {update.updatedByName}
                          </span>
                        </div>
                        {update.context && (
                          <p className="text-sm text-muted-foreground mt-1">
                            &quot;{update.context}&quot;
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(update.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No status history yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </ContentPanel>
    </>
  );
}

export default function WarriorDetailPage() {
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
        <WarriorDetailContent />
      </Authenticated>
    </>
  );
}
