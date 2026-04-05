import { cn } from "@/lib/utils";

interface GradientHeaderProps {
  children: React.ReactNode;
  /** Tall header with extra bottom padding (for dashboard greeting). Default: false */
  tall?: boolean;
  className?: string;
}

export function GradientHeader({ children, tall = false, className }: GradientHeaderProps) {
  return (
    <div className={cn("gradient-header text-white", tall ? "pb-14" : "pb-12", className)}>
      <div className="container mx-auto px-5 pt-6">
        {children}
      </div>
    </div>
  );
}

interface ContentPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentPanel({ children, className }: ContentPanelProps) {
  return (
    <div className="bg-background -mt-8 rounded-t-3xl relative z-10 min-h-[60vh]">
      <div className={cn(
        "container mx-auto px-5 pt-6 pb-8",
        className
      )}>
        {children}
      </div>
    </div>
  );
}
