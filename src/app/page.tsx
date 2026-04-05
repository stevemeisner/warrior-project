import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  MessageCircle,
  HeartHandshake,
  Shield,
  ArrowRight,
  UserPlus,
  Heart,
  Users,
} from "lucide-react";
import { statusIconMap } from "@/components/icons/status-icons";

const statusCards = [
  {
    key: "thriving" as const,
    label: "Thriving",
    desc: "Great day!",
    color: "text-green-600",
    bg: "bg-green-50 border-green-100",
  },
  {
    key: "stable" as const,
    label: "Stable",
    desc: "Normal day",
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-100",
  },
  {
    key: "struggling" as const,
    label: "Struggling",
    desc: "Hard day",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-100",
  },
  {
    key: "hospitalized" as const,
    label: "Hospitalized",
    desc: "In hospital",
    color: "text-red-500",
    bg: "bg-red-50 border-red-100",
  },
  {
    key: "needsSupport" as const,
    label: "Needs Support",
    desc: "Could use help",
    color: "text-purple-500",
    bg: "bg-purple-50 border-purple-100",
  },
  {
    key: "feather" as const,
    label: "Feather",
    desc: "Remembering",
    color: "text-slate-500",
    bg: "bg-slate-50 border-slate-100",
  },
] as const;

const features = [
  {
    Icon: MapPin,
    title: "Find Nearby Warriors",
    desc: "Connect with families in your area through our interactive map. See who's nearby and reach out when you're ready.",
    iconColor: "text-primary",
  },
  {
    Icon: MessageCircle,
    title: "Stay Connected",
    desc: "Share status updates, send messages, and keep your support network informed about your warrior's journey.",
    iconColor: "text-secondary",
  },
  {
    Icon: HeartHandshake,
    title: "Give & Receive Support",
    desc: "When you need help, let others know. When you can help, be there for those who need it most.",
    iconColor: "text-accent",
  },
  {
    Icon: Users,
    title: "Community Forum",
    desc: "Discuss shared experiences, ask questions, and find answers in a safe space built for families like yours.",
    iconColor: "text-primary",
  },
  {
    Icon: Shield,
    title: "Privacy You Control",
    desc: "Choose exactly who sees your warrior's profile. Share openly or keep it within your trusted circle.",
    iconColor: "text-secondary",
  },
  {
    Icon: Heart,
    title: "Always There",
    desc: "Real-time updates and notifications mean your village is with you — even during the hardest moments.",
    iconColor: "text-accent",
  },
];

const steps = [
  {
    step: "1",
    Icon: UserPlus,
    title: "Create Your Account",
    desc: "Sign up as a family or caregiver. Add your warriors and set your preferences.",
  },
  {
    step: "2",
    Icon: Heart,
    title: "Build Your Village",
    desc: "Invite caregivers, connect with nearby families, and join community discussions.",
  },
  {
    step: "3",
    Icon: HeartHandshake,
    title: "Support Each Other",
    desc: "Share updates, request help when needed, and be there for others in your community.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-header relative py-28 px-4 text-center overflow-hidden">
        {/* TODO: hero illustration */}

        <div className="container mx-auto max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-8 backdrop-blur-sm">
            <Shield className="h-4 w-4" strokeWidth={1.75} />
            <span>A community built on care</span>
          </div>

          <h1 className="font-heading text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white leading-tight">
            Every warrior deserves a{" "}
            <span className="text-white/80 italic">village</span>
          </h1>

          <p className="text-xl text-white/85 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect families of children with special needs and the caregivers
            who stand beside them. Share updates, find support, and know
            you&apos;re never alone.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base px-8 h-12 bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
              >
                Get Started
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/signin">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto text-base px-8 h-12 text-white hover:bg-white/15 hover:text-white border border-white/30"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section — cream background */}
      <section className="py-20 px-4 bg-[oklch(0.98_0.01_70)]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Everything you need</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3 text-foreground">
              How We Connect and Support
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Built with love for the families and caregivers navigating this
              journey together.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-start gap-4 p-6 rounded-2xl bg-white shadow-sm border border-border/40 card-hover"
              >
                <div className="icon-box">
                  <feature.Icon
                    className={`h-5 w-5 ${feature.iconColor}`}
                    strokeWidth={1.75}
                  />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold mb-1 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status Showcase — white background */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="section-label mb-3">At a glance</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3 text-foreground">
              Share Your Warrior&apos;s Journey
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Quick status updates help your community know how you&apos;re
              doing without the need for lengthy explanations.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statusCards.map((status) => {
              const Icon = statusIconMap[status.key];
              return (
                <div
                  key={status.key}
                  className={`flex items-center gap-3 p-4 rounded-2xl border ${status.bg} transition-all duration-200 hover:scale-[1.02]`}
                >
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 ${status.color} bg-white/60`}
                  >
                    <Icon className={`size-5 ${status.color}`} />
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${status.color}`}>
                      {status.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{status.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works — cream background */}
      <section className="py-20 px-4 bg-[oklch(0.98_0.01_70)]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Simple to start</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              How It Works
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm border border-border/40 mb-5">
                  <item.Icon
                    className="h-7 w-7 text-primary"
                    strokeWidth={1.75}
                  />
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2 text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500 via-amber-400 to-teal-500 p-12 text-center shadow-xl">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-white">
              You&apos;re Not Alone
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto leading-relaxed">
              Join a community that understands your journey. Connect with
              families, share experiences, and find the support you deserve.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="text-base px-8 h-12 bg-white text-amber-600 hover:bg-white/90 font-semibold shadow-md"
              >
                Join Our Community
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-white">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <span className="font-heading font-semibold text-foreground">
              Warrior Project
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Connecting families and caregivers with love and support.
          </p>
        </div>
      </footer>
    </div>
  );
}
