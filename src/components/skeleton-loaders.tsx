import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8" role="status" aria-label="Loading dashboard">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Shimmer className="h-9 w-64 mb-2" />
          <Shimmer className="h-5 w-96" />
        </div>
        <Shimmer className="h-9 w-28" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <Shimmer className="h-8 w-12 mb-2" />
            <Shimmer className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Warriors section */}
      <Shimmer className="h-7 w-36 mb-4" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Shimmer className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Shimmer className="h-5 w-32 mb-1" />
                <Shimmer className="h-4 w-20" />
              </div>
            </div>
            <Shimmer className="h-4 w-full mb-2" />
            <Shimmer className="h-4 w-3/4" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading dashboard content</span>
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8" role="status" aria-label="Loading messages">
      <Shimmer className="h-9 w-40 mb-6" />
      <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversation list */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <Shimmer className="h-5 w-28" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b">
              <Shimmer className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Shimmer className="h-4 w-28 mb-1" />
                <Shimmer className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
        {/* Message area */}
        <div className="md:col-span-2 rounded-xl border bg-card flex items-center justify-center">
          <Shimmer className="h-5 w-56" />
        </div>
      </div>
      <span className="sr-only">Loading messages</span>
    </div>
  );
}

export function CommunitySkeleton() {
  return (
    <div className="container mx-auto px-4 py-8" role="status" aria-label="Loading community">
      <div className="flex justify-between items-center mb-6">
        <Shimmer className="h-9 w-40" />
        <Shimmer className="h-9 w-36" />
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shimmer className="h-5 w-16" />
                <Shimmer className="h-5 w-20" />
              </div>
              <Shimmer className="h-6 w-3/4 mb-2" />
              <Shimmer className="h-4 w-full mb-1" />
              <Shimmer className="h-4 w-2/3" />
              <div className="flex items-center gap-4 mt-3">
                <Shimmer className="h-5 w-5 rounded-full" />
                <Shimmer className="h-4 w-20" />
                <Shimmer className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-8 flex items-center justify-center">
          <Shimmer className="h-5 w-56" />
        </div>
      </div>
      <span className="sr-only">Loading community discussions</span>
    </div>
  );
}

export function NotificationsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl" role="status" aria-label="Loading notifications">
      <div className="flex items-center justify-between mb-8">
        <Shimmer className="h-9 w-40" />
        <Shimmer className="h-9 w-32" />
      </div>
      <div className="rounded-xl border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-4 border-b last:border-b-0">
            <Shimmer className="h-8 w-8 rounded" />
            <div className="flex-1">
              <Shimmer className="h-5 w-48 mb-1" />
              <Shimmer className="h-4 w-full mb-2" />
              <Shimmer className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading notifications</span>
    </div>
  );
}
