import { cn } from "@/lib/utils";

interface StatusIconProps {
  className?: string;
}

export function ThrivingIcon({ className }: StatusIconProps) {
  return (
    <img src="/illustrations/status/thriving.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function StableIcon({ className }: StatusIconProps) {
  return (
    <img src="/illustrations/status/stable.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function StrugglingIcon({ className }: StatusIconProps) {
  return (
    <img src="/illustrations/status/struggling.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function HospitalizedIcon({ className }: StatusIconProps) {
  return (
    <img src="/illustrations/status/hospitalized.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function NeedsSupportIcon({ className }: StatusIconProps) {
  return (
    <img src="/illustrations/status/needs-support.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

export function FeatherIcon({ className }: StatusIconProps) {
  return (
    <img src="/illustrations/status/feather.png" alt="" className={cn("size-6 object-contain mix-blend-multiply", className)} />
  );
}

/** Map from status value to icon component */
export const statusIconMap = {
  thriving: ThrivingIcon,
  stable: StableIcon,
  struggling: StrugglingIcon,
  hospitalized: HospitalizedIcon,
  needsSupport: NeedsSupportIcon,
  feather: FeatherIcon,
} as const;
