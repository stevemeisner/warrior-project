import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-4xl">
          <span className="text-6xl mb-6 block">🛡️</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to the Warrior Project
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A supportive community connecting families with special needs children
            and the caregivers who stand beside them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Join Our Community
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            How We Connect and Support
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <span className="text-4xl mb-4 block">📍</span>
                <h3 className="text-xl font-semibold mb-2">Find Nearby Warriors</h3>
                <p className="text-muted-foreground">
                  Connect with families in your area through our interactive map.
                  See who&apos;s nearby and reach out when you&apos;re ready.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <span className="text-4xl mb-4 block">💬</span>
                <h3 className="text-xl font-semibold mb-2">Stay Connected</h3>
                <p className="text-muted-foreground">
                  Share status updates, send messages, and keep your support
                  network informed about your warrior&apos;s journey.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <span className="text-4xl mb-4 block">💜</span>
                <h3 className="text-xl font-semibold mb-2">Give & Receive Support</h3>
                <p className="text-muted-foreground">
                  When you need help, let others know. When you can help, be
                  there for those who need it most.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Status System Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-8">
            Share Your Warrior&apos;s Journey
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Quick status updates help your community know how you&apos;re doing
            without the need for lengthy explanations.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { emoji: "🌟", label: "Thriving", desc: "Great day!" },
              { emoji: "💙", label: "Stable", desc: "Normal day" },
              { emoji: "🌧️", label: "Struggling", desc: "Hard day" },
              { emoji: "🏥", label: "Hospitalized", desc: "In hospital" },
              { emoji: "💜", label: "Needs Support", desc: "Could use help" },
              { emoji: "🪶", label: "Feather", desc: "Remembering" },
            ].map((status) => (
              <div
                key={status.label}
                className="flex items-center gap-3 p-4 rounded-lg bg-card"
              >
                <span className="text-3xl">{status.emoji}</span>
                <div>
                  <p className="font-medium">{status.label}</p>
                  <p className="text-sm text-muted-foreground">{status.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">You&apos;re Not Alone</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join discussions, share experiences, and find resources in our
            community forums. Connect with others who understand your journey.
          </p>
          <Link href="/signup">
            <Button size="lg">Get Started Today</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>
            Warrior Project - Connecting families and caregivers with love and
            support.
          </p>
        </div>
      </footer>
    </div>
  );
}
