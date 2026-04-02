"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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

const helpTypeLabels: Record<string, { label: string; emoji: string }> = {
  meals: { label: "Meals", emoji: "🍽️" },
  transportation: { label: "Transportation", emoji: "🚗" },
  childcare: { label: "Childcare", emoji: "👶" },
  emotional: { label: "Emotional Support", emoji: "💛" },
  financial: { label: "Financial", emoji: "💰" },
  medical: { label: "Medical", emoji: "🏥" },
  other: { label: "Other", emoji: "📋" },
};

function SupportContent() {
  const account = useQuery(api.accounts.getCurrentAccount);
  const myRequests = useQuery(api.supportRequests.getMySupportRequests, {});
  const availableRequests = useQuery(api.supportRequests.getAvailableSupportRequests);
  const warriors = useQuery(api.warriors.getMyWarriors);

  const createRequest = useMutation(api.supportRequests.createSupportRequest);
  const updateRequest = useMutation(api.supportRequests.updateSupportRequest);
  const deleteRequest = useMutation(api.supportRequests.deleteSupportRequest);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWarrior, setSelectedWarrior] = useState<string>("");
  const [selectedHelpTypes, setSelectedHelpTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (account === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!account) return null;

  const isFamily = account.role === "family";

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHelpTypes.length === 0) {
      toast.error("Please select at least one type of help");
      return;
    }

    setIsCreating(true);
    try {
      await createRequest({
        warriorId: selectedWarrior ? (selectedWarrior as any) : undefined,
        helpTypes: selectedHelpTypes,
        description: description.trim() || undefined,
      });
      toast.success("Support request created");
      setIsCreateOpen(false);
      setSelectedWarrior("");
      setSelectedHelpTypes([]);
      setDescription("");
    } catch (error) {
      toast.error("Failed to create request");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleHelpType = (type: string) => {
    setSelectedHelpTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">
            {isFamily
              ? "Ask for help when you need it"
              : "See how you can help families you care for"}
          </p>
        </div>
        {isFamily && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>Ask for Help</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Request Support</DialogTitle>
                <DialogDescription>
                  Let your caregivers know what kind of help you need.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRequest} className="space-y-4">
                {warriors && warriors.length > 0 && (
                  <div className="space-y-2">
                    <Label>For warrior (optional)</Label>
                    <Select value={selectedWarrior} onValueChange={setSelectedWarrior}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a warrior" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">General request</SelectItem>
                        {warriors.map((w) => (
                          <SelectItem key={w._id} value={w._id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>What kind of help do you need?</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(helpTypeLabels).map(([key, { label, emoji }]) => (
                      <button
                        key={key}
                        type="button"
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors",
                          selectedHelpTypes.includes(key)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-muted"
                        )}
                        onClick={() => toggleHelpType(key)}
                      >
                        <span>{emoji}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Details (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell your caregivers more about what you need..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Sending..." : "Send Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Family view: my requests */}
      {isFamily && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Your Requests</h2>
          {myRequests === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border bg-card p-4 h-24" />
              ))}
            </div>
          ) : myRequests.length > 0 ? (
            <div className="space-y-3">
              {myRequests.map((request: any) => (
                <Card key={request._id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={request.isActive ? "default" : "secondary"}
                            className="rounded-full"
                          >
                            {request.isActive ? "Active" : "Closed"}
                          </Badge>
                          {request.warriorName && (
                            <span className="text-sm text-muted-foreground">
                              for {request.warriorName}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {request.helpTypes.map((type: string) => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
                            >
                              {helpTypeLabels[type]?.emoji} {helpTypeLabels[type]?.label || type}
                            </span>
                          ))}
                        </div>
                        {request.description && (
                          <p className="text-sm text-muted-foreground">{request.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {request.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await updateRequest({
                                  requestId: request._id,
                                  isActive: false,
                                });
                                toast.success("Request closed");
                              } catch {
                                toast.error("Failed to close request");
                              }
                            }}
                          >
                            Close
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={async () => {
                            try {
                              await deleteRequest({ requestId: request._id });
                              toast.success("Request deleted");
                            } catch {
                              toast.error("Failed to delete request");
                            }
                          }}
                        >
                          Delete
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
                <p className="text-muted-foreground mb-2">No support requests yet</p>
                <p className="text-sm text-muted-foreground">
                  When you need help, your caregivers will be notified.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Caregiver view: available requests from families */}
      {!isFamily && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Families Needing Help</h2>
          {availableRequests === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border bg-card p-4 h-24" />
              ))}
            </div>
          ) : availableRequests.length > 0 ? (
            <div className="space-y-3">
              {availableRequests.map((request: any) => (
                <Card key={request._id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.familyPhoto} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {request.familyName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{request.familyName}</span>
                          {request.warriorName && (
                            <span className="text-sm text-muted-foreground">
                              for {request.warriorName}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {request.helpTypes.map((type: string) => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs"
                            >
                              {helpTypeLabels[type]?.emoji} {helpTypeLabels[type]?.label || type}
                            </span>
                          ))}
                        </div>
                        {request.description && (
                          <p className="text-sm text-muted-foreground">{request.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link href={`/messages?to=${request.accountId}`}>
                        <Button size="sm">Reach Out</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-2">No active support requests</p>
                <p className="text-sm text-muted-foreground">
                  When a family you care for needs help, their requests will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

export default function SupportPage() {
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
        <SupportContent />
      </Authenticated>
    </>
  );
}
