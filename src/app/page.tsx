import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  MessageCircle,
  HeartHandshake,
  Shield,
  ArrowRight,
  UserPlus,
  Heart,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 px-4 text-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-secondary/5 to-accent/8" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto max-w-4xl relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Shield className="h-4 w-4" strokeWidth={1.75} />
            <span>A community built on care</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Every warrior deserves a{" "}
            <span className="text-primary">village</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect families of children with special needs and the caregivers
            who stand beside them. Share updates, find support, and know
            you&apos;re never alone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12">
                Join Our Community
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-12">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">
              How We Connect and Support
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built with love for the families and caregivers navigating this journey together.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                Icon: MapPin,
                title: "Find Nearby Warriors",
                desc: "Connect with families in your area through our interactive map. See who's nearby and reach out when you're ready.",
                color: "bg-primary/10 text-primary",
              },
              {
                Icon: MessageCircle,
                title: "Stay Connected",
                desc: "Share status updates, send messages, and keep your support network informed about your warrior's journey.",
                color: "bg-secondary/10 text-secondary",
              },
              {
                Icon: HeartHandshake,
                title: "Give & Receive Support",
                desc: "When you need help, let others know. When you can help, be there for those who need it most.",
                color: "bg-accent/10 text-accent-foreground",
              },
            ].map((feature) => (
              <Card key={feature.title} className="text-center card-hover border-0 shadow-sm bg-card">
                <CardContent className="pt-8 pb-6">
                  <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${feature.color} mb-5`}>
                    <feature.Icon className="h-7 w-7" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Status System Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-muted/30 to-muted/60">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">
              Share Your Warrior&apos;s Journey
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Quick status updates help your community know how you&apos;re doing
              without the need for lengthy explanations.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { emoji: "🌟", label: "Thriving", desc: "Great day!", bg: "bg-green-50 border-green-200" },
              { emoji: "💙", label: "Stable", desc: "Normal day", bg: "bg-blue-50 border-blue-200" },
              { emoji: "🌧️", label: "Struggling", desc: "Hard day", bg: "bg-amber-50 border-amber-200" },
              { emoji: "🏥", label: "Hospitalized", desc: "In hospital", bg: "bg-red-50 border-red-200" },
              { emoji: "💜", label: "Needs Support", desc: "Could use help", bg: "bg-purple-50 border-purple-200" },
              { emoji: "🪶", label: "Feather", desc: "Remembering", bg: "bg-gray-50 border-gray-200" },
            ].map((status) => (
              <div
                key={status.label}
                className={`flex items-center gap-3 p-4 rounded-xl border ${status.bg} transition-all duration-200 hover:scale-[1.02]`}
              >
                <span className="text-3xl" aria-hidden="true">{status.emoji}</span>
                <div>
                  <p className="font-medium">{status.label}</p>
                  <p className="text-sm text-muted-foreground">{status.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-14">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
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
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-5">
                  <item.Icon className="h-8 w-8 text-primary" strokeWidth={1.75} />
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">You&apos;re Not Alone</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
              Join a community that understands your journey. Connect with
              families, share experiences, and find the support you deserve.
            </p>
            <Link href="/signup">
              <Button size="lg" className="text-base px-8 h-12">
                Get Started Today
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <span className="font-semibold">Warrior Project</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Connecting families and caregivers with love and support.
          </p>
        </div>
      </footer>
    </div>
  );
}
