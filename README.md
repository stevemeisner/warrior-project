# Warrior Project

A web application for tracking and managing warrior training activities, built with Next.js and Convex.

## Tech Stack

- **Framework:** Next.js 16 (React 19)
- **Styling:** Tailwind CSS 4
- **Backend:** Convex (serverless functions + real-time database)
- **Authentication:** Convex Auth (Google OAuth + email/password)
- **Maps:** Mapbox GL JS (optional)
- **Email:** Resend (optional)

## Quick Start

```bash
# Install dependencies
npm install

# Start Convex dev server (first run will prompt for setup)
npx convex dev

# Generate auth signing key (required for authentication)
npx @convex-dev/auth

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Setup

For detailed setup instructions including Google OAuth configuration and production deployment, see **[SETUP.md](./SETUP.md)**.

## Development Commands

```bash
npm run dev        # Start Next.js + Convex dev servers
npm run dev:next   # Start only Next.js
npm run dev:convex # Start only Convex
npm run build      # Build for production
npm run lint       # Run linter
```

## Project Structure

```
├── src/app/          # Next.js app router pages
├── convex/           # Convex backend functions and schema
├── components/       # React components
└── lib/              # Utility functions and shared code
```
