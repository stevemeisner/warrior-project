"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface WarriorFormProps {
  warrior?: {
    _id: string;
    name: string;
    dateOfBirth?: string;
    condition?: string;
    bio?: string;
    visibility: "public" | "connections" | "private";
  };
  onSuccess?: () => void;
}

export function WarriorForm({ warrior, onSuccess }: WarriorFormProps) {
  const router = useRouter();
  const createWarrior = useMutation(api.warriors.createWarrior);
  const updateWarrior = useMutation(api.warriors.updateWarrior);

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(warrior?.name || "");
  const [dateOfBirth, setDateOfBirth] = useState(warrior?.dateOfBirth || "");
  const [condition, setCondition] = useState(warrior?.condition || "");
  const [bio, setBio] = useState(warrior?.bio || "");
  const [visibility, setVisibility] = useState<"public" | "connections" | "private">(
    warrior?.visibility || "public"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (warrior) {
        await updateWarrior({
          warriorId: warrior._id as any,
          name,
          dateOfBirth: dateOfBirth || undefined,
          condition: condition || undefined,
          bio: bio || undefined,
          visibility,
        });
        toast.success("Warrior updated successfully");
      } else {
        await createWarrior({
          name,
          dateOfBirth: dateOfBirth || undefined,
          condition: condition || undefined,
          bio: bio || undefined,
          visibility,
        });
        toast.success("Warrior created successfully");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to save warrior");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{warrior ? "Edit Warrior" : "Add New Warrior"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Warrior's name"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition / Diagnosis</Label>
            <Input
              id="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g., CHD, Cancer, Autism"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share a little about your warrior..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value: "public" | "connections" | "private") =>
                setVisibility(value)
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  Public - Visible to all members
                </SelectItem>
                <SelectItem value="connections">
                  Connections - Only visible to people you&apos;ve connected with
                </SelectItem>
                <SelectItem value="private">
                  Private - Only visible to you and caregivers
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading
                ? "Saving..."
                : warrior
                  ? "Update Warrior"
                  : "Add Warrior"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
