import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export function HomeIcon({ className }: IconProps) {
  return (
    <img src="/illustrations/nav/home.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function CommunityIcon({ className }: IconProps) {
  return (
    <img src="/illustrations/nav/community.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function MessagesIcon({ className }: IconProps) {
  return (
    <img src="/illustrations/nav/messages.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function MapIcon({ className }: IconProps) {
  return (
    <img src="/illustrations/nav/map.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <img src="/illustrations/nav/profile.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}
