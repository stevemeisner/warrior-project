"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { Settings, ShieldCheck, Bell, User, Ban } from "lucide-react";

function SettingsContent() {
  const account = useQuery(api.accounts.getCurrentAccount);
  const blockedUsers = useQuery(api.blockedUsers.getBlockedUsers);
  const updateAccount = useMutation(api.accounts.updateAccount);
  const updatePrivacy = useMutation(api.accounts.updatePrivacySettings);
  const updateNotifications = useMutation(api.accounts.updateNotificationPreferences);
  const unblockUser = useMutation(api.blockedUsers.unblockUser);

  const [isSaving, setIsSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileState, setProfileState] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setProfileName(account.name || "");
      setProfileCity(account.location?.city || "");
      setProfileState(account.location?.state || "");
    }
  }, [account]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const updates: Parameters<typeof updateAccount>[0] = {};
      if (profileName !== (account?.name || "")) {
        updates.name = profileName;
      }
      const currentCity = account?.location?.city || "";
      const currentState = account?.location?.state || "";
      if (profileCity !== currentCity || profileState !== currentState) {
        updates.location = {
          latitude: account?.location?.latitude || 0,
          longitude: account?.location?.longitude || 0,
          city: profileCity || undefined,
          state: profileState || undefined,
        };
      }
      await updateAccount(updates);
      toast.success("Profile updated");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUnblock = async (accountId: string) => {
    setUnblockingId(accountId);
    try {
      await unblockUser({ accountId: accountId as any });
      toast.success("User unblocked");
    } catch (error) {
      toast.error("Failed to unblock user");
    } finally {
      setUnblockingId(null);
    }
  };

  const handlePrivacyChange = async (
    key: "showLocation" | "showEmail" | "defaultVisibility",
    value: boolean | string
  ) => {
    setIsSaving(true);
    try {
      await updatePrivacy({ [key]: value });
      toast.success("Privacy settings updated");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = async (
    key: string,
    value: boolean
  ) => {
    setIsSaving(true);
    try {
      await updateNotifications({ [key]: value });
      toast.success("Notification settings updated");
    } catch (error) {
      toast.error("Failed to update settings");
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
          <p className="text-muted-foreground">Loading settings...</p>
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

  const privacy = account.privacySettings || {
    showLocation: true,
    showEmail: false,
    defaultVisibility: "public" as const,
  };

  const notifications = account.notificationPreferences || {
    emailStatusChanges: true,
    emailNewMessages: true,
    emailSupportRequests: true,
    inAppStatusChanges: true,
    inAppNewMessages: true,
    inAppSupportRequests: true,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Profile Editing */}
      <Card className="mb-6 rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>
            Update your display name and location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profileName">Name</Label>
            <Input
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profileCity">City</Label>
              <Input
                id="profileCity"
                value={profileCity}
                onChange={(e) => setProfileCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileState">State</Label>
              <Input
                id="profileState"
                value={profileState}
                onChange={(e) => setProfileState(e.target.value)}
                placeholder="State"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="mb-6 rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Privacy</CardTitle>
          </div>
          <CardDescription>
            Control what information others can see about you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showLocation" className="text-base">
                Show Location on Map
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow others to see your approximate location
              </p>
            </div>
            <Switch
              id="showLocation"
              checked={privacy.showLocation}
              onCheckedChange={(checked) =>
                handlePrivacyChange("showLocation", checked)
              }
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="showEmail" className="text-base">
                Show Email Address
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow others to see your email address
              </p>
            </div>
            <Switch
              id="showEmail"
              checked={privacy.showEmail}
              onCheckedChange={(checked) =>
                handlePrivacyChange("showEmail", checked)
              }
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultVisibility" className="text-base">
              Default Warrior Visibility
            </Label>
            <p className="text-sm text-muted-foreground">
              Default visibility for new warriors and status updates
            </p>
            <Select
              value={privacy.defaultVisibility}
              onValueChange={(value) =>
                handlePrivacyChange("defaultVisibility", value)
              }
              disabled={isSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Visible to all</SelectItem>
                <SelectItem value="connections">
                  Connections - Only visible to people you&apos;ve connected with
                </SelectItem>
                <SelectItem value="private">
                  Private - Only visible to you and caregivers
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="mb-6 rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-4">Email Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailStatusChanges">Status Changes</Label>
                <Switch
                  id="emailStatusChanges"
                  checked={notifications.emailStatusChanges}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("emailStatusChanges", checked)
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="emailNewMessages">New Messages</Label>
                <Switch
                  id="emailNewMessages"
                  checked={notifications.emailNewMessages}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("emailNewMessages", checked)
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="emailSupportRequests">Support Requests</Label>
                <Switch
                  id="emailSupportRequests"
                  checked={notifications.emailSupportRequests}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("emailSupportRequests", checked)
                  }
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">In-App Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="inAppStatusChanges">Status Changes</Label>
                <Switch
                  id="inAppStatusChanges"
                  checked={notifications.inAppStatusChanges}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("inAppStatusChanges", checked)
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="inAppNewMessages">New Messages</Label>
                <Switch
                  id="inAppNewMessages"
                  checked={notifications.inAppNewMessages}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("inAppNewMessages", checked)
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="inAppSupportRequests">Support Requests</Label>
                <Switch
                  id="inAppSupportRequests"
                  checked={notifications.inAppSupportRequests}
                  onCheckedChange={(checked) =>
                    handleNotificationChange("inAppSupportRequests", checked)
                  }
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="mb-6 rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p>{account.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Role</Label>
            <p className="capitalize">{account.role}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Member Since</Label>
            <p>{new Date(account.createdAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Blocked Users */}
      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-primary" />
            <CardTitle>Blocked Users</CardTitle>
          </div>
          <CardDescription>
            Manage users you have blocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!blockedUsers || blockedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t blocked anyone</p>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((block) =>
                block.blockedAccount ? (
                  <div
                    key={block._id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {block.blockedAccount.profilePhoto ? (
                        <img
                          src={block.blockedAccount.profilePhoto}
                          alt={block.blockedAccount.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium">
                        {block.blockedAccount.name}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(block.blockedAccount!._id)}
                      disabled={unblockingId === block.blockedAccount._id}
                    >
                      {unblockingId === block.blockedAccount._id
                        ? "Unblocking..."
                        : "Unblock"}
                    </Button>
                  </div>
                ) : null
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
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
        <SettingsContent />
      </Authenticated>
    </>
  );
}
