"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { GradientHeader, ContentPanel } from "@/components/gradient-header";
import { HeartHandshake, Plus, UtensilsCrossed, Car, Baby, Heart, Wallet, Stethoscope, ClipboardList } from "lucide-react";

const helpTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  meals: { label: "Meals", icon: <UtensilsCrossed className="size-4" /> },
  transportation: { label: "Transportation", icon: <Car className="size-4" /> },
  childcare: { label: "Childcare", icon: <Baby className="size-4" /> },
  emotional: { label: "Emotional Support", icon: <Heart className="size-4" /> },
  financial: { label: "Financial", icon: <Wallet className="size-4" /> },
  medical: { label: "Medical", icon: <Stethoscope className="size-4" /> },
  other: { label: "Other", icon: <ClipboardList className="size-4" /> },
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
      <>
        <GradientHeader>
          <div className="flex items-center gap-3 pb-2">
            <HeartHandshake className="h-6 w-6 text-white/80" strokeWidth={1.75} />
            <h1 className="text-2xl font-heading font-bold text-white">Support</h1>
          </div>
        </GradientHeader>
        <ContentPanel>
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </ContentPanel>
      </>
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
    } catch {
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
    <>
      <GradientHeader>
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <HeartHandshake className="h-6 w-6 text-white/80" strokeWidth={1.75} />
            <div>
              <h1 className="text-2xl font-heading font-bold text-white">Support</h1>
              <p className="text-white/70 text-sm">
                {isFamily
                  ? "Ask for help when you need it"
                  : "See how you can help families you care for"}
              </p>
            </div>
          </div>
          {isFamily && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Ask for Help
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading">Request Support</DialogTitle>
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
                      {Object.entries(helpTypeLabels).map(([key, { label, icon }]) => (
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
                          {icon}
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
      </GradientHeader>

      <ContentPanel>
        {/* Family view: my requests */}
        {isFamily && (
          <section className="space-y-4">
            <p className="section-label">Your Requests</p>
            {myRequests === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border bg-card p-4 h-24" />
                ))}
              </div>
            ) : myRequests.length > 0 ? (
              <div className="space-y-3">
                {myRequests.map((request: any) => (
                  <Card key={request._id} className="rounded-2xl border-0 shadow-sm">
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
                                {helpTypeLabels[type]?.icon} {helpTypeLabels[type]?.label || type}
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
                              className="rounded-xl"
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
              <div className="py-16 text-center text-muted-foreground">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
                  <HeartHandshake className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.75} />
                </div>
                <p className="font-heading font-semibold text-foreground mb-1">No requests yet</p>
                <p className="text-sm">
                  When you need help, your caregivers will be notified.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Caregiver view: available requests from families */}
        {!isFamily && (
          <section className="space-y-4">
            <p className="section-label">Families Needing Help</p>
            {availableRequests === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border bg-card p-4 h-24" />
                ))}
              </div>
            ) : availableRequests.length > 0 ? (
              <div className="space-y-3">
                {availableRequests.map((request: any) => (
                  <Card key={request._id} className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={request.familyPhoto} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold">
                            {request.familyName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-heading font-semibold">{request.familyName}</span>
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
                                {helpTypeLabels[type]?.icon} {helpTypeLabels[type]?.label || type}
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
                          <Button size="sm" className="rounded-xl shrink-0">Reach Out</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
                  <HeartHandshake className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.75} />
                </div>
                <p className="font-heading font-semibold text-foreground mb-1">No active requests</p>
                <p className="text-sm">
                  When a family you care for needs help, their requests will appear here.
                </p>
              </div>
            )}
          </section>
        )}
      </ContentPanel>
    </>
  );
}

export default function SupportPage() {
  return (
    <>
      <AuthLoading>
        <GradientHeader>
          <div className="flex items-center gap-3 pb-2">
            <HeartHandshake className="h-6 w-6 text-white/80" strokeWidth={1.75} />
            <h1 className="text-2xl font-heading font-bold text-white">Support</h1>
          </div>
        </GradientHeader>
        <ContentPanel>
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </ContentPanel>
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
