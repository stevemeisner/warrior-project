import { cn } from "@/lib/utils";

interface StatusIconProps {
  className?: string;
}

export function ThrivingIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-6", className)}>
      <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6z" />
    </svg>
  );
}

export function StableIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-6", className)}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function StrugglingIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-6", className)}>
      <path d="M4.5 8C4.5 5.5 6.5 3.5 9 3.5h6c2.5 0 4.5 2 4.5 4.5 0 2-1.5 3.5-3 4.5-.5.3-.5.8-.5 1.3v.7h-8v-.7c0-.5 0-1-.5-1.3C6 11.5 4.5 10 4.5 8zM9 17h6M10 19.5h4" />
    </svg>
  );
}

export function HospitalizedIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-6", className)}>
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 10h-2.5v2.5h-3V13H8v-3h2.5V7.5h3V10H16v3z" />
    </svg>
  );
}

export function NeedsSupportIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-6", className)}>
      <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z" />
      <path d="M9 11l1.5 1.5L15 8" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function FeatherIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={cn("size-6", className)}>
      <path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
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
