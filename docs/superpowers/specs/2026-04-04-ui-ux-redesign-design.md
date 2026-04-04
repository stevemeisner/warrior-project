# Warrior Project UI/UX Redesign

## Goals

1. **Distinctive identity** — Replace the generic shadcn/ui look with a warm, branded experience that reflects a community for families with special needs children.
2. **Accessibility for all ages** — Grandparents and less tech-savvy users need larger touch targets, clearer labels, and readable text sizes. Generous by default, not as an opt-in mode.

## Design Direction

**Tone**: Nurturing + hopeful. Warm foundation that celebrates these kids without being flippant about serious moments. The app should feel like a trusted, caring community — not a clinical tool or a children's toy.

**Approach**: "Sunlit Horizon" — bold gradient header that flows into warm cream content panels, timeline-style updates for conversational content, rich cards for structured content, custom illustrated icons throughout.

---

## 1. Design Tokens & Color System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#1a7a6a` (warm teal) | Nav, links, warrior names, active states |
| `--secondary` | `#3aab7a` (rich green) | Gradient endpoints, success states |
| `--accent` | `#c48a2a` (golden amber) | Section labels, highlights, warm accents |
| `--background` | `#faf7f2` (warm cream) | Page backgrounds |
| `--card` | `#ffffff` | Cards floating on cream background |
| `--header-gradient` | `linear-gradient(135deg, #1a7a6a → #d4983a)` | App header on all pages |
| `--border` | `rgba(212,152,58,0.12)` | Dividers, card borders, timeline separators |

### Status Colors (unchanged values, bolder application)

| Status | Color | Icon |
|---|---|---|
| Thriving | `#7cb086` (green) | Custom illustrated star/sparkle |
| Stable | `#4a90a4` (blue) | Custom illustrated heart/steady |
| Struggling | `#e5a85f` (amber) | Custom illustrated rain cloud |
| Hospitalized | `#d97459` (coral) | Custom illustrated hospital/cross |
| Needs Support | `#9b7ebd` (purple) | Custom illustrated hands/embrace |
| Feather | `#a8a8a8` (gray) | Custom illustrated feather |

### Border Radius

- Base: `16px` (up from 14px)
- Cards: `18px`
- Nav pills/badges: `12px`
- Buttons: `12px`
- Full round: avatars, status dots

### Shadows

- Cards: `0 1px 4px rgba(0,0,0,0.03), 0 4px 16px rgba(26,122,106,0.06)`
- Card hover: `0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(26,122,106,0.1)` with `translateY(-2px)`
- Avatars: `0 2px 8px rgba(26,122,106,0.2)` (teal tint) or `rgba(196,138,42,0.2)` (amber tint)

---

## 2. Typography

### Font Stack

- **Headings**: Comfortaa (Google Fonts), weights 500-700
- **Body/UI**: Source Sans 3 (Google Fonts), weights 400-700
- Replace Geist Sans and Geist Mono entirely

### Scale

| Role | Size | Weight | Font | Line Height |
|---|---|---|---|---|
| Page greeting/hero | 24-28px | 700 | Comfortaa | 1.3 |
| Section heading | 18-20px | 600 | Comfortaa | 1.3 |
| Card title | 16px | 600 | Comfortaa | 1.3 |
| Body text | 16px | 400 | Source Sans 3 | 1.55 |
| UI labels (buttons, nav, badges) | 14-15px | 600 | Source Sans 3 | 1.4 |
| Timestamps, hints | 13px | 400 | Source Sans 3 | 1.4 |
| Section labels (smallest) | 12px | 600 | Comfortaa | 1.3 |

**Hard floor**: Nothing below 12px anywhere in the app. Body text never below 16px.

---

## 3. Layout System

### Header Pattern (all pages)

- Gradient header (`--header-gradient`) with white text
- Dashboard: tall header with greeting + subtitle (padding-bottom ~56px)
- Inner pages: shorter header with page title only (padding-bottom ~48px)
- Content area overlaps header with `border-radius: 26px 26px 0 0` cream panel
- Creates a distinctive "app shell" feel

### Content Area

- Background: `--background` (warm cream)
- White card sections float on top
- Max content width: `768px` on desktop, full-width on mobile
- Horizontal padding: `20px` (`px-5`)
- Section spacing: `24px` between major sections

### Two Content Modes

**Timeline/flow mode** — for status updates, community threads, conversations:
- No card wrapper
- Items separated by warm border lines (`--border`)
- Emoji/status icons in 40px gradient-tinted rounded square containers
- Background: `linear-gradient(135deg, rgba(26,122,106,0.06), rgba(212,152,58,0.1))`

**Rich card mode** — for warrior profiles, dashboard stats, quick actions, search results:
- White cards, 18px radius, subtle shadow
- Avatar with gradient background (teal or amber depending on context)
- Comfortaa name, Source Sans details
- Hover: lift `translateY(-2px)` with deeper shadow

### Page-Specific Layouts

| Page | Layout |
|---|---|
| Dashboard | Stats strip + timeline updates + warrior cards. Desktop: 2-column grid |
| Community/Threads | Timeline mode. Thread detail: card header + timeline comments |
| Messages | Chat bubbles (existing pattern, restyled with new tokens) |
| Map | Full-bleed map, warrior preview cards overlay |
| Profile | Rich cards for warrior list, form cards for editing |
| Settings | Form cards on cream background |
| Onboarding | Illustrated steps, one per screen, large touch targets |

---

## 4. Navigation

### Mobile (bottom tab bar)

- **5 tabs**: Home, Community, Messages, Map, Profile
- Custom illustrated icons (NanoBanana-generated SVGs), ~24px display
- Active state: teal icon + warm background pill + gradient top accent bar (3px, teal-to-gold)
- Inactive: light gray icon + label
- Unread badge: red dot/count on Messages
- Min touch target: 48px per tab
- White background with warm `border-top`

### Desktop (in-header nav)

- Horizontal nav items inside the gradient header
- Active: frosted glass pill (`rgba(255,255,255,0.18)`)
- Source Sans 3 at 15px, 600 weight when active
- Notification bell + user avatar on right side

### Relocated Items

| Item | New Location |
|---|---|
| Settings | Profile page |
| Notifications | Bell icon in header (mobile + desktop) |
| Support | Profile page |
| Caregivers | Profile page or warrior detail |
| Search | Search icon in header or search bar on Community |

---

## 5. Accessibility

### Touch Targets

- Minimum: 44px on all interactive elements
- Primary action buttons: 48px height, `px-6` (24px padding)
- Secondary buttons: 44px height, `px-5`
- Icon buttons: 44x44px minimum
- Form inputs: 48px height, 16px internal padding
- **Remove** current xs (24px) and default (36px) button sizes — new floor is 44px

### Contrast

- All text meets WCAG AA minimum
- White text on gradient header (verified during implementation)
- Muted text: darken from `#999` to `#777` if needed for AA on cream background
- Status meaning conveyed by icon + text label, never color alone

### Focus & Keyboard

- Visible focus ring: 3px teal outline with 2px offset on all interactive elements
- Skip-to-content link (existing, retained)
- Tab order follows natural document flow
- All dropdown/dialog interactions via Radix UI (keyboard-managed)

### Labels

- Every icon-only button gets `aria-label`
- Nav tabs always show text labels (no icon-only tabs)
- Form fields always have visible labels above input (no placeholder-only)
- Status indicators: icon + text label always paired

---

## 6. Custom Illustrations & Icons

All generated with NanoBanana. Consistent warm, slightly rounded illustrated style — "friendly hand-drawn meets clean digital."

### Nav Icons (5 SVGs)

Home, Community, Messages, Map, Profile. Two states: inactive (gray) and active (teal with subtle gradient). Scalable SVG.

### Status Icons (6 SVGs)

Thriving (star/sparkle), Stable (heart/steady), Struggling (rain cloud), Hospitalized (hospital/cross), Needs Support (hands/embrace), Feather (feather). Replace current emoji entirely. Must work at 16px (inline badge), 24px (timeline), 40px (status selector), 64px (detail view).

### Empty State Illustrations (~6)

No messages, No warriors, No community posts, No notifications, No search results, Welcome/onboarding. Display at 200-300px. Warm, hopeful tone with characters or scenes. Centered with heading and action button below.

### Landing Page Hero (1)

Main illustration capturing community/family/support theme. Warm palette matching app gradient.

### Onboarding Step Illustrations (~4)

One per wizard step. Same style as empty states.

---

## 7. Scope & Constraints

- **Light mode only** — dark mode deferred as a fast follow
- **No new features** — this is a reskin/UX pass, not a feature release
- **Existing functionality preserved** — all current features continue working
- **Incremental implementation** — design tokens and fonts first, then layout, then icons/illustrations
- **Mobile-first** — design and test mobile before desktop at each step

## 8. What Stays the Same

- Convex backend (untouched)
- All business logic and data flow
- Mapbox GL integration (restyled markers/cards only)
- Radix UI primitives under shadcn components
- Sonner toast notifications (restyled)
- Existing accessibility foundation (skip links, ARIA attributes, semantic HTML)
