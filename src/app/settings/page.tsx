"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function SettingsContent() {
  const account = useQuery(api.accounts.getCurrentAccount);
  const updatePrivacy = useMutation(api.accounts.updatePrivacySettings);
  const updateNotifications = useMutation(api.accounts.updateNotificationPreferences);

  const [isSaving, setIsSaving] = useState(false);

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
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Privacy Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
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
