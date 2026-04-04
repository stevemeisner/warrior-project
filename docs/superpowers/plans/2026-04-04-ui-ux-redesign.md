# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Warrior Project from a generic shadcn/ui app into a distinctive, warm, accessible community platform with the "Sunlit Horizon" design language.

**Architecture:** Bottom-up approach — design tokens and fonts first, then core UI components, then layout shell (header/nav), then page-by-page restyling. Each task produces a working commit. Custom icons are generated with NanoBanana and integrated as SVG components.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 (PostCSS plugin, no config file), Comfortaa + Source Sans 3 (Google Fonts via next/font), CVA for button/component variants, NanoBanana MCP for illustration generation.

**Spec:** `docs/superpowers/specs/2026-04-04-ui-ux-redesign-design.md`

---

## File Map

### Files to Modify
| File | Changes |
|---|---|
| `src/app/globals.css` | Replace color tokens, update radius, remove dark mode, add header gradient and new component classes |
| `src/app/layout.tsx` | Swap Geist for Comfortaa + Source Sans 3, update theme color, restructure layout for gradient header |
| `src/components/navigation.tsx` | Complete rewrite — gradient header, 5-tab mobile nav with custom icons, relocated secondary items |
| `src/components/ui/button.tsx` | Update size variants (44px minimum), update border radius |
| `src/components/ui/input.tsx` | Update height to 48px, update font, padding |
| `src/components/ui/card.tsx` | Update radius to 18px, update shadow |
| `src/components/status-selector.tsx` | Replace emoji with custom SVG icons, update sizing for accessibility |
| `src/components/warrior-card.tsx` | Restyle with new card design, gradient avatars |
| `src/components/skeleton-loaders.tsx` | Update to match new design tokens |
| `src/app/page.tsx` | Restyle landing page with new identity |
| `src/app/dashboard/page.tsx` | Gradient header greeting, timeline updates, rich warrior cards |
| `src/app/community/page.tsx` | Timeline layout for threads |
| `src/app/messages/page.tsx` | Restyle with new tokens |
| `src/app/map/page.tsx` | Restyle markers, filter bar, preview cards |
| `src/app/profile/page.tsx` | Restyle profile with new cards |
| `src/app/settings/page.tsx` | Restyle with new form cards |
| `src/app/(auth)/signin/page.tsx` | Restyle auth pages |
| `src/app/(auth)/signup/page.tsx` | Restyle auth pages |
| `src/app/(auth)/onboarding/page.tsx` | Add illustrations, restyle wizard |
| `src/app/notifications/page.tsx` | Restyle with timeline layout |
| `src/app/search/page.tsx` | Restyle with new cards |
| `src/app/support/page.tsx` | Restyle with new tokens |
| `src/app/caregivers/page.tsx` | Restyle with new tokens |

### Files to Create
| File | Purpose |
|---|---|
| `src/components/icons/nav-icons.tsx` | Custom SVG nav icons (Home, Community, Messages, Map, Profile) |
| `src/components/icons/status-icons.tsx` | Custom SVG status icons (Thriving, Stable, Struggling, Hospitalized, NeedsSupport, Feather) |
| `src/components/empty-state.tsx` | Reusable empty state component with illustration slot |
| `src/components/gradient-header.tsx` | Shared gradient header component used across all pages |
| `public/illustrations/` | NanoBanana-generated empty state and onboarding illustrations (PNG/SVG) |

---

## Task 1: Design Tokens & Typography Foundation

**Files:**
- Modify: `src/app/globals.css` (lines 1-161)
- Modify: `src/app/layout.tsx` (lines 1-57)

- [ ] **Step 1: Update globals.css with new color tokens**

Replace the entire `src/app/globals.css` with the new Sunlit Horizon design tokens:

```css
@import "tailwindcss";
@import "tw-animate-css";

:root {
  /* Sunlit Horizon Color Palette */
  --primary: oklch(0.48 0.1 170);            /* Warm teal #1a7a6a */
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.62 0.12 155);         /* Rich green #3aab7a */
  --secondary-foreground: oklch(0.98 0 0);
  --accent: oklch(0.65 0.14 70);             /* Golden amber #c48a2a */
  --accent-foreground: oklch(0.15 0 0);

  /* Status colors */
  --status-thriving: oklch(0.62 0.12 155);   /* Green */
  --status-stable: oklch(0.55 0.12 220);     /* Blue */
  --status-struggling: oklch(0.65 0.14 70);  /* Amber */
  --status-hospitalized: oklch(0.6 0.15 30); /* Coral */
  --status-needs-support: oklch(0.55 0.12 300); /* Purple */
  --status-feather: oklch(0.7 0 0);          /* Soft gray */

  /* UI colors */
  --background: oklch(0.97 0.008 80);        /* Warm cream #faf7f2 */
  --foreground: oklch(0.15 0 0);
  --muted: oklch(0.94 0.008 80);
  --muted-foreground: oklch(0.48 0 0);       /* #777 for AA contrast on cream */
  --border: oklch(0.88 0.02 70);             /* Warm border with amber tint */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.15 0 0);
  --input: oklch(0.90 0.008 80);
  --ring: oklch(0.48 0.1 170);               /* Matches primary teal */
  --radius: 1rem;                            /* 16px base, up from 14px */

  --destructive: oklch(0.55 0.2 25);
  --destructive-foreground: oklch(0.98 0 0);

  /* Chart colors */
  --chart-1: oklch(0.48 0.1 170);
  --chart-2: oklch(0.62 0.12 155);
  --chart-3: oklch(0.65 0.14 70);
  --chart-4: oklch(0.6 0.15 30);
  --chart-5: oklch(0.55 0.12 300);

  /* Sidebar — matches main theme */
  --sidebar: oklch(0.97 0.008 80);
  --sidebar-foreground: oklch(0.15 0 0);
  --sidebar-primary: oklch(0.48 0.1 170);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.94 0.008 80);
  --sidebar-accent-foreground: oklch(0.15 0 0);
  --sidebar-border: oklch(0.88 0.02 70);
  --sidebar-ring: oklch(0.48 0.1 170);

  /* Gradient header */
  --header-from: oklch(0.48 0.1 170);        /* Teal */
  --header-to: oklch(0.65 0.14 70);          /* Golden amber */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-source-sans);
  --font-heading: var(--font-comfortaa);

  /* Status colors for Tailwind classes */
  --color-status-thriving: var(--status-thriving);
  --color-status-stable: var(--status-stable);
  --color-status-struggling: var(--status-struggling);
  --color-status-hospitalized: var(--status-hospitalized);
  --color-status-needs-support: var(--status-needs-support);
  --color-status-feather: var(--status-feather);

  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);

  /* Header gradient colors for Tailwind */
  --color-header-from: var(--header-from);
  --color-header-to: var(--header-to);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans), Arial, Helvetica, sans-serif;
  }
  html {
    scroll-behavior: smooth;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading), var(--font-sans), Arial, Helvetica, sans-serif;
  }
}

@layer components {
  .card-hover {
    @apply transition-all duration-200 ease-out;
  }
  .card-hover:hover {
    @apply -translate-y-0.5 shadow-md;
  }
  /* Gradient header utility */
  .gradient-header {
    background: linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%);
  }
  /* Section label style */
  .section-label {
    font-family: var(--font-heading), var(--font-sans), Arial, Helvetica, sans-serif;
    @apply text-xs font-semibold uppercase tracking-wide text-accent;
  }
  /* Emoji/icon container for timeline items */
  .icon-box {
    @apply w-10 h-10 rounded-xl flex items-center justify-center shrink-0;
    background: linear-gradient(135deg, oklch(0.48 0.1 170 / 0.06), oklch(0.65 0.14 70 / 0.1));
  }
}
```

- [ ] **Step 2: Update layout.tsx with new fonts**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { Comfortaa, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navigation } from "@/components/navigation";
import { Toaster } from "@/components/ui/sonner";

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Warrior Project",
  description: "A community platform connecting families with special needs children and their caregivers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Warrior Project",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#1a7a6a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${comfortaa.variable} ${sourceSans.variable} antialiased`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
          Skip to main content
        </a>
        <Providers>
          <Navigation />
          <main id="main-content" className="pb-16 md:pb-0">{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the app builds and renders**

Run: `npm run build 2>&1 | head -30`
Expected: Build succeeds. Fonts load. Background is warm cream. Headings use Comfortaa.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: replace design tokens and fonts with Sunlit Horizon theme

Swap Geist for Comfortaa (headings) + Source Sans 3 (body).
Update color palette to warm teal/amber. Bump base radius to 16px.
Remove dark mode tokens (light-only for now).
Add gradient-header, section-label, and icon-box utility classes."
```

---

## Task 2: Core UI Components — Button, Input, Card

**Files:**
- Modify: `src/components/ui/button.tsx` (lines 1-65)
- Modify: `src/components/ui/input.tsx` (lines 1-22)
- Modify: `src/components/ui/card.tsx` (lines 1-93)

- [ ] **Step 1: Update button.tsx with accessible sizes**

Replace `src/components/ui/button.tsx`:

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-semibold transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border bg-background shadow-xs hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "h-10 rounded-lg gap-1.5 px-4 text-sm has-[>svg]:px-3",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-6",
        icon: "size-11 rounded-xl",
        "icon-sm": "size-10 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

Key changes: minimum height 40px (sm) / 44px (default) / 48px (lg). Removed xs sizes. Updated radius to xl. Default SVG size bumped to size-5. Font weight semibold.

- [ ] **Step 2: Update input.tsx with accessible height**

Replace `src/components/ui/input.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-12 w-full min-w-0 rounded-xl border bg-transparent px-4 py-3 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

Key changes: height from h-9 to h-12 (48px). Padding from px-3 py-1 to px-4 py-3. Radius from rounded-lg to rounded-xl. Text stays text-base (no md:text-sm downsize).

- [ ] **Step 3: Update card.tsx with new design**

Replace `src/components/ui/card.tsx`:

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border py-6 shadow-[0_1px_4px_rgba(0,0,0,0.03),0_4px_16px_rgba(26,122,106,0.06)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

Key changes: radius from rounded-xl to rounded-2xl (18px). Shadow updated to new warm teal-tinted shadow. CardTitle gets `font-heading` class for Comfortaa.

- [ ] **Step 4: Verify the app builds**

Run: `npm run build 2>&1 | head -30`
Expected: Build succeeds. Buttons are taller. Inputs are taller. Cards have warmer shadow.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/card.tsx
git commit -m "feat: update button, input, and card components for accessibility

Button: min 40px height, removed xs sizes, rounded-xl.
Input: 48px height, rounded-xl, generous padding.
Card: 18px radius, warm teal-tinted shadow, Comfortaa titles."
```

---

## Task 3: Custom Nav Icons

**Files:**
- Create: `src/components/icons/nav-icons.tsx`

- [ ] **Step 1: Generate nav icons with NanoBanana**

Use NanoBanana to generate 5 custom illustrated nav icons in a consistent warm, rounded line art style. Prompt each icon individually, requesting SVG-friendly clean line art with rounded caps and joins:

Icons needed: Home, Community, Messages, Map, Profile

Save the generated images, then trace or recreate as clean React SVG components.

- [ ] **Step 2: Create nav-icons.tsx**

Create `src/components/icons/nav-icons.tsx` with all 5 icons as React components. Each icon accepts `className` and renders an SVG with `currentColor` fill/stroke so Tailwind color utilities work:

```tsx
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cn("size-6", className)}>
      <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 01-1.5 1.5h-4a1 1 0 01-1-1v-4.5a1 1 0 00-1-1h-3a1 1 0 00-1 1V20.5a1 1 0 01-1 1h-4A1.5 1.5 0 013 20V10.5z" />
    </svg>
  );
}

export function CommunityIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cn("size-6", className)}>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M15 14.5c2.2 0 4 1.8 4 4v1.5" />
    </svg>
  );
}

export function MessagesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cn("size-6", className)}>
      <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2H7l-4 3.5V6a2 2 0 012-2z" />
      <path d="M8 10h8M8 13.5h5" />
    </svg>
  );
}

export function MapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cn("size-6", className)}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cn("size-6", className)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
```

Note: These are initial placeholder SVGs matching the warm rounded line art style. After NanoBanana generation, replace the `<path>` data with the actual generated icon paths. The component interface stays the same.

- [ ] **Step 3: Verify icons render**

Import one icon in any page temporarily to confirm it renders at various sizes:
Run: `npm run build 2>&1 | head -20`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/icons/nav-icons.tsx
git commit -m "feat: add custom SVG nav icons for Sunlit Horizon redesign

5 icons: Home, Community, Messages, Map, Profile.
Warm rounded line art style, currentColor for Tailwind integration."
```

---

## Task 4: Custom Status Icons

**Files:**
- Create: `src/components/icons/status-icons.tsx`
- Modify: `src/components/status-selector.tsx` (lines 1-143)

- [ ] **Step 1: Generate status icons with NanoBanana**

Use NanoBanana to generate 6 custom illustrated status icons. Each should be a warm, friendly illustration that communicates the status at a glance. Request clean, scalable designs:

- Thriving: radiant star or sparkle
- Stable: steady heart or anchor
- Struggling: soft rain cloud
- Hospitalized: gentle hospital/medical cross
- Needs Support: open hands or embrace
- Feather: single feather floating

- [ ] **Step 2: Create status-icons.tsx**

Create `src/components/icons/status-icons.tsx`:

```tsx
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
```

Note: Same as nav icons — these are initial SVG placeholders. NanoBanana-generated paths replace them. The `statusIconMap` export lets any component look up the right icon by status value.

- [ ] **Step 3: Update status-selector.tsx to use custom icons**

Replace `src/components/status-selector.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { statusIconMap } from "@/components/icons/status-icons";

export type WarriorStatus =
  | "thriving"
  | "stable"
  | "struggling"
  | "hospitalized"
  | "needsSupport"
  | "feather";

interface StatusOption {
  value: WarriorStatus;
  label: string;
  description: string;
  colorClass: string;
}

const statusOptions: StatusOption[] = [
  {
    value: "thriving",
    label: "Thriving",
    description: "Great day!",
    colorClass: "text-status-thriving",
  },
  {
    value: "stable",
    label: "Stable",
    description: "Normal day",
    colorClass: "text-status-stable",
  },
  {
    value: "struggling",
    label: "Struggling",
    description: "Hard day",
    colorClass: "text-status-struggling",
  },
  {
    value: "hospitalized",
    label: "Hospitalized",
    description: "In hospital",
    colorClass: "text-status-hospitalized",
  },
  {
    value: "needsSupport",
    label: "Needs Support",
    description: "Could use help",
    colorClass: "text-status-needs-support",
  },
  {
    value: "feather",
    label: "Feather",
    description: "Passed away",
    colorClass: "text-status-feather",
  },
];

interface StatusSelectorProps {
  currentStatus: WarriorStatus;
  onStatusChange: (status: WarriorStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function StatusSelector({
  currentStatus,
  onStatusChange,
  disabled = false,
  compact = false,
}: StatusSelectorProps) {
  return (
    <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
      {statusOptions.map((option) => {
        const Icon = statusIconMap[option.value];
        return (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            disabled={disabled}
            aria-pressed={currentStatus === option.value}
            aria-label={`${option.label}: ${option.description}`}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              compact ? "px-3 py-2 text-sm" : "px-4 py-3",
              "min-h-[44px]",
              currentStatus === option.value
                ? "border-primary bg-primary/10"
                : "border-transparent bg-muted hover:bg-muted/80",
              disabled && "cursor-not-allowed opacity-50"
            )}
            title={option.description}
          >
            <Icon className={cn("size-5", option.colorClass)} />
            {!compact && <span className="font-medium">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface StatusBadgeProps {
  status: WarriorStatus;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({
  status,
  showLabel = true,
  size = "md",
}: StatusBadgeProps) {
  const option = statusOptions.find((o) => o.value === status);
  if (!option) return null;

  const Icon = statusIconMap[status];

  const sizeClasses = {
    sm: "text-xs px-2.5 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const iconSizes = {
    sm: "size-3.5",
    md: "size-4",
    lg: "size-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeClasses[size]
      )}
      style={{
        background: `linear-gradient(135deg, var(--status-${status === "needsSupport" ? "needs-support" : status}) / 0.1, var(--status-${status === "needsSupport" ? "needs-support" : status}) / 0.18)`,
        color: `var(--status-${status === "needsSupport" ? "needs-support" : status})`,
      }}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{option.label}</span>}
      {!showLabel && <span className="sr-only">{option.label}</span>}
    </span>
  );
}

export function getStatusInfo(status: WarriorStatus): StatusOption | undefined {
  return statusOptions.find((o) => o.value === status);
}
```

Key changes: emoji replaced with SVG icons via `statusIconMap`. Buttons have 44px min height. StatusBadge uses gradient background matching status color. `aria-label` added to selector buttons.

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: Build succeeds. Status selector renders icons instead of emoji.

- [ ] **Step 5: Commit**

```bash
git add src/components/icons/status-icons.tsx src/components/status-selector.tsx
git commit -m "feat: replace emoji with custom SVG status icons

6 status icons: Thriving, Stable, Struggling, Hospitalized, NeedsSupport, Feather.
StatusSelector buttons now 44px min height with aria-labels.
StatusBadge uses gradient backgrounds matching status colors."
```

---

## Task 5: Gradient Header Component

**Files:**
- Create: `src/components/gradient-header.tsx`

- [ ] **Step 1: Create the shared gradient header**

Create `src/components/gradient-header.tsx`:

```tsx
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
    <div className={cn(
      "bg-background -mt-8 rounded-t-3xl relative z-10 min-h-[60vh]",
      "px-5 pt-6 pb-8",
      "max-w-3xl mx-auto md:max-w-none",
      className
    )}>
      {children}
    </div>
  );
}
```

This component pair is used on every authenticated page:
- `<GradientHeader>` renders the colored header area with the page title/greeting
- `<ContentPanel>` renders the overlapping cream content area below it

- [ ] **Step 2: Commit**

```bash
git add src/components/gradient-header.tsx
git commit -m "feat: add GradientHeader and ContentPanel layout components

Shared layout pair for the Sunlit Horizon header-into-content pattern.
GradientHeader supports tall mode for dashboard greeting."
```

---

## Task 6: Navigation Redesign

**Files:**
- Modify: `src/components/navigation.tsx` (lines 1-269)

- [ ] **Step 1: Rewrite navigation.tsx**

Replace `src/components/navigation.tsx` with the new design. The key changes:
- Desktop: nav items move inside the gradient header
- Mobile: 5 tabs (Home, Community, Messages, Map, Profile) with custom icons, active gradient accent bar
- Secondary items (Settings, Notifications, Support, Caregivers) move to profile/header
- Bell icon in both mobile and desktop header

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Bell, LogOut, User, Settings, HeartHandshake, Shield, Search } from "lucide-react";
import { HomeIcon, CommunityIcon, MessagesIcon, MapIcon, ProfileIcon } from "@/components/icons/nav-icons";

const mobileNavItems = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/community", label: "Community", Icon: CommunityIcon },
  { href: "/messages", label: "Messages", Icon: MessagesIcon },
  { href: "/map", label: "Map", Icon: MapIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

const desktopNavItems = [
  { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
  { href: "/community", label: "Community", Icon: CommunityIcon },
  { href: "/messages", label: "Messages", Icon: MessagesIcon },
  { href: "/map", label: "Map", Icon: MapIcon },
];

function AuthenticatedNav() {
  const { signOut } = useAuthActions();
  const account = useQuery(api.accounts.getCurrentAccount);
  const unreadMessages = useQuery(api.messages.getUnreadCount);
  const unreadNotifications = useQuery(api.notifications.getUnreadCount);
  const pathname = usePathname();

  const initials = account?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 w-full gradient-header shadow-md hidden md:block">
        <div className="container mx-auto flex h-14 items-center px-5">
          <Link href="/dashboard" className="flex items-center gap-2 mr-8">
            <Shield className="h-5 w-5 text-white" strokeWidth={1.75} />
            <span className="font-heading font-bold text-lg text-white">Warrior Project</span>
          </Link>

          <nav className="flex items-center gap-1 flex-1" role="navigation" aria-label="Main navigation">
            {desktopNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/18 text-white font-semibold"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.Icon className="size-4" />
                  <span>{item.label}</span>
                  {item.href === "/messages" && unreadMessages && unreadMessages > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-white text-primary rounded-full font-bold">
                      {unreadMessages}
                      <span className="sr-only"> unread messages</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/search">
              <Button variant="ghost" size="icon-sm" className="text-white/70 hover:text-white hover:bg-white/10" aria-label="Search">
                <Search className="size-5" strokeWidth={1.75} />
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="icon-sm" className="relative text-white/70 hover:text-white hover:bg-white/10" aria-label="Notifications">
                <Bell className="size-5" strokeWidth={1.75} />
                {unreadNotifications && unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 text-[10px] bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                    {unreadNotifications}
                    <span className="sr-only"> unread notifications</span>
                  </span>
                )}
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1" aria-label="User menu">
                  <Avatar className="h-9 w-9 ring-2 ring-white/30">
                    <AvatarImage src={account?.profilePhoto} alt={account?.name} />
                    <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={account?.profilePhoto} alt={account?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{account?.name}</p>
                    <p className="text-xs text-muted-foreground">{account?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" strokeWidth={1.75} />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" strokeWidth={1.75} />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/support" className="flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4" strokeWidth={1.75} />
                    Support
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive flex items-center gap-2">
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium transition-all duration-200 relative rounded-xl min-h-[48px]",
                  isActive
                    ? "text-primary bg-primary/6"
                    : "text-muted-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-gradient-to-r from-primary to-accent" />
                )}
                <item.Icon className={cn("size-5", isActive && "text-primary")} />
                <span>{item.label}</span>
                {item.href === "/messages" && unreadMessages && unreadMessages > 0 && (
                  <span className="absolute top-1 right-1/4 px-1 py-0.5 text-[10px] bg-red-500 text-white rounded-full min-w-[16px] text-center font-bold">
                    {unreadMessages}
                    <span className="sr-only"> unread messages</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Bar (logo + bell + avatar only) */}
      <header className="sticky top-0 z-50 w-full gradient-header shadow-md md:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-white" strokeWidth={1.75} />
            <span className="font-heading font-bold text-base text-white">Warrior Project</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/notifications">
              <Button variant="ghost" size="icon-sm" className="text-white/70 hover:text-white hover:bg-white/10 size-9" aria-label="Notifications">
                <Bell className="size-4" strokeWidth={1.75} />
                {unreadNotifications && unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[9px] bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="User menu">
                  <Avatar className="h-7 w-7 ring-2 ring-white/30">
                    <AvatarImage src={account?.profilePhoto} alt={account?.name} />
                    <AvatarFallback className="bg-white/20 text-white text-[10px] font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={account?.profilePhoto} alt={account?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{account?.name}</p>
                    <p className="text-xs text-muted-foreground">{account?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" strokeWidth={1.75} />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" strokeWidth={1.75} />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/support" className="flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4" strokeWidth={1.75} />
                    Support
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive flex items-center gap-2">
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}

function UnauthenticatedNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/signin") || pathname.startsWith("/signup")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full gradient-header shadow-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-white" strokeWidth={1.75} />
          <span className="font-heading font-bold text-lg text-white">Warrior Project</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/signin">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-white text-primary hover:bg-white/90 font-semibold">Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full gradient-header shadow-md">
      <div className="container mx-auto flex h-14 items-center px-5">
        <div className="flex items-center gap-2 mr-6">
          <Shield className="h-5 w-5 text-white" strokeWidth={1.75} />
          <span className="font-heading font-bold text-lg text-white">Warrior Project</span>
        </div>
        <div className="flex-1" />
        <div className="h-8 w-8 rounded-full bg-white/20 animate-pulse" />
      </div>
    </header>
  );
}

export function Navigation() {
  return (
    <>
      <AuthLoading>
        <NavSkeleton />
      </AuthLoading>
      <Authenticated>
        <AuthenticatedNav />
      </Authenticated>
      <Unauthenticated>
        <UnauthenticatedNav />
      </Unauthenticated>
    </>
  );
}
```

Key changes: gradient header instead of white header. Desktop nav inside gradient. Mobile: separate top bar (logo+bell+avatar) and bottom tab bar (5 tabs with custom icons). Active tab has gradient top accent bar. Support/Caregivers/Settings moved to dropdown menu. 48px mobile tab height.

- [ ] **Step 2: Verify build and visual check**

Run: `npm run build 2>&1 | head -30`
Expected: Build succeeds. Navigation renders with gradient header.

- [ ] **Step 3: Commit**

```bash
git add src/components/navigation.tsx
git commit -m "feat: redesign navigation with gradient header and 5-tab mobile nav

Desktop: nav items inside gradient header with frosted glass active state.
Mobile: gradient top bar + 5-tab bottom bar with custom icons and gradient accent.
Relocated Settings, Support, Caregivers to profile dropdown.
All touch targets 48px minimum."
```

---

## Task 7: Dashboard Page Redesign

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Read the current dashboard page**

Read `src/app/dashboard/page.tsx` to understand the full current implementation before rewriting. The redesign applies:
- GradientHeader with personalized greeting (replaces the plain heading)
- ContentPanel with cream background
- Quick stats strip (horizontal scroll mobile, row desktop)
- Timeline layout for recent updates (no card wrappers)
- Rich warrior cards with gradient avatars

The exact rewrite depends on the current page structure (queries, state, etc.), so the implementing agent must read the file and adapt the new design to the existing data fetching and business logic. Do NOT change any Convex queries or mutations — only restyle the JSX and Tailwind classes.

- [ ] **Step 2: Apply the redesign**

Wrap the page content with `<GradientHeader tall>` for the greeting and `<ContentPanel>` for the body. Convert the status update list to timeline mode (no card wrappers, icon-box containers, warm border dividers). Convert warrior list to rich cards with gradient avatars. Convert stats to horizontal strip.

Use these imports:
```tsx
import { GradientHeader, ContentPanel } from "@/components/gradient-header";
```

- [ ] **Step 3: Verify build and visual check**

Run: `npm run build 2>&1 | head -30`
Expected: Build succeeds. Dashboard shows gradient header with greeting.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: redesign dashboard with gradient header and timeline updates

Personalized greeting in gradient header. Stats strip. Timeline-style
status updates with icon-box containers. Rich warrior cards with
gradient avatars. Cream content panel."
```

---

## Task 8: Community Page Redesign

**Files:**
- Modify: `src/app/community/page.tsx`

- [ ] **Step 1: Read and restyle the community page**

Read `src/app/community/page.tsx`. Apply:
- Short GradientHeader with "Community" title
- ContentPanel body
- Timeline layout for thread list (no card wrappers for individual threads)
- Thread cards get Comfortaa titles, warm borders, icon-box for avatars
- Preserve all existing query logic and interactions

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/community/page.tsx
git commit -m "feat: redesign community page with timeline thread layout"
```

---

## Task 9: Messages Page Redesign

**Files:**
- Modify: `src/app/messages/page.tsx`

- [ ] **Step 1: Read and restyle the messages page**

Read `src/app/messages/page.tsx`. Apply:
- Short GradientHeader with "Messages" title
- ContentPanel body
- Conversation list with warm styling (gradient avatars, cream background)
- Chat bubbles restyled with new radius and colors
- Preserve all existing query logic

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/messages/page.tsx
git commit -m "feat: redesign messages page with warm styling and gradient avatars"
```

---

## Task 10: Map Page Redesign

**Files:**
- Modify: `src/app/map/page.tsx`

- [ ] **Step 1: Read and restyle the map page**

Read `src/app/map/page.tsx`. Apply:
- Compact GradientHeader or remove header for full-bleed map
- Filter bar restyled with new button variants and status icons
- Warrior preview card: updated radius, shadow, gradient avatar
- Map marker colors updated to match new palette
- Preserve all Mapbox GL logic

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/map/page.tsx
git commit -m "feat: redesign map page with updated markers and preview cards"
```

---

## Task 11: Profile & Settings Pages

**Files:**
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/profile/[accountId]/page.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Read and restyle profile pages**

Apply GradientHeader with user name, ContentPanel body. Warrior list as rich cards. Profile info in clean card layout.

- [ ] **Step 2: Read and restyle settings page**

Apply short GradientHeader, ContentPanel, form cards with new input heights and spacing.

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/ src/app/settings/
git commit -m "feat: redesign profile and settings pages with gradient headers"
```

---

## Task 12: Auth Pages Redesign

**Files:**
- Modify: `src/app/(auth)/signin/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`
- Modify: `src/app/(auth)/onboarding/page.tsx`
- Modify: `src/components/auth/sign-in-form.tsx`
- Modify: `src/components/auth/sign-up-form.tsx`

- [ ] **Step 1: Read and restyle auth pages**

Apply warm cream background, centered card with new radius/shadow, Comfortaa headings, 48px inputs, 44px+ buttons. Onboarding: add illustration placeholders (empty div with comment for NanoBanana follow-up).

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/ src/components/auth/
git commit -m "feat: redesign auth and onboarding pages with Sunlit Horizon styling"
```

---

## Task 13: Remaining Pages (Notifications, Search, Support, Caregivers)

**Files:**
- Modify: `src/app/notifications/page.tsx`
- Modify: `src/app/search/page.tsx`
- Modify: `src/app/support/page.tsx`
- Modify: `src/app/caregivers/page.tsx`

- [ ] **Step 1: Read and restyle all four pages**

Apply to each: GradientHeader with page title, ContentPanel body, updated card/list styling with new tokens. Notifications: timeline mode. Search: results as rich cards. Support/Caregivers: form cards.

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/notifications/ src/app/search/ src/app/support/ src/app/caregivers/
git commit -m "feat: redesign notifications, search, support, and caregivers pages"
```

---

## Task 14: Landing Page Redesign

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read and restyle landing page**

Read `src/app/page.tsx`. Apply:
- Gradient hero section (uses gradient-header class) with Comfortaa heading, white text
- Updated CTA buttons (white primary, ghost secondary)
- Feature section with icon-box containers
- Status showcase with new custom status icons
- Warm cream sections alternating with white
- Placeholder for NanoBanana hero illustration

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign landing page with gradient hero and warm sections"
```

---

## Task 15: Empty State Component

**Files:**
- Create: `src/components/empty-state.tsx`

- [ ] **Step 1: Create reusable empty state**

Create `src/components/empty-state.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Illustration src or React node */
  illustration?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const ActionWrapper = actionHref ? "a" : "button";

  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      {illustration && (
        <div className="mb-6 w-48 h-48 flex items-center justify-center">
          {illustration}
        </div>
      )}
      <h3 className="font-heading text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-base max-w-sm mb-6">{description}</p>
      {actionLabel && (
        <Button
          asChild={!!actionHref}
          onClick={onAction}
        >
          {actionHref ? <a href={actionHref}>{actionLabel}</a> : actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/empty-state.tsx
git commit -m "feat: add reusable EmptyState component with illustration slot"
```

---

## Task 16: Warrior Card & Skeleton Loaders Update

**Files:**
- Modify: `src/components/warrior-card.tsx`
- Modify: `src/components/skeleton-loaders.tsx`

- [ ] **Step 1: Read and restyle warrior-card.tsx**

Apply: gradient avatar background, Comfortaa name, new card radius/shadow, StatusBadge with custom icons, 44px min touch target on clickable areas.

- [ ] **Step 2: Read and update skeleton-loaders.tsx**

Update skeleton loaders to match new design: warm cream background tones, rounded-2xl cards, gradient header placeholder.

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/components/warrior-card.tsx src/components/skeleton-loaders.tsx
git commit -m "feat: restyle warrior cards and skeleton loaders for Sunlit Horizon"
```

---

## Task 17: Generate NanoBanana Illustrations

**Files:**
- Create: `public/illustrations/*.png` (or SVG)

- [ ] **Step 1: Generate empty state illustrations**

Use NanoBanana MCP tools to generate illustrations for:
1. No messages yet
2. No warriors added
3. No community posts
4. No notifications
5. No search results
6. Welcome / onboarding

Style: warm, friendly, illustrated characters or scenes matching the teal/amber palette. Save to `public/illustrations/`.

- [ ] **Step 2: Generate onboarding step illustrations**

Generate ~4 illustrations for the onboarding wizard steps.

- [ ] **Step 3: Generate landing page hero**

Generate one hero illustration for the landing page.

- [ ] **Step 4: Integrate illustrations into EmptyState usage and onboarding**

Update pages that have empty states to use the `<EmptyState>` component with the generated illustrations. Update onboarding to show step illustrations.

- [ ] **Step 5: Commit**

```bash
git add public/illustrations/ src/
git commit -m "feat: add NanoBanana-generated illustrations for empty states and onboarding"
```

---

## Task 18: Final Polish & Audit

**Files:**
- Various — all modified files

- [ ] **Step 1: Visual audit across all pages**

Run the app with `npm run dev` and check every page:
- Fonts rendering correctly (Comfortaa headings, Source Sans body)
- Colors match the Sunlit Horizon palette
- All buttons/inputs meet 44px minimum touch target
- No text below 12px
- Gradient header consistent across pages
- Mobile nav works correctly with 5 tabs
- Status icons render at all sizes

- [ ] **Step 2: Fix any visual issues found**

Address any inconsistencies, missed pages, or sizing issues.

- [ ] **Step 3: Run build to confirm no errors**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 4: Run tests to confirm nothing broken**

Run: `npm test`
Expected: All existing tests pass. No functional changes were made.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish and audit pass for Sunlit Horizon redesign"
```
