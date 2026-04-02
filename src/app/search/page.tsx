"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import {
  Search,
  Users,
  Heart,
  MessageSquare,
  MessageCircle,
  User,
} from "lucide-react";

const categoryColors: Record<string, { bg: string; text: string }> = {
  general: { bg: "bg-gray-100", text: "text-gray-700" },
  support: { bg: "bg-purple-100", text: "text-purple-700" },
  resources: { bg: "bg-blue-100", text: "text-blue-700" },
  celebrations: { bg: "bg-green-100", text: "text-green-700" },
  questions: { bg: "bg-amber-100", text: "text-amber-700" },
};

function SearchContent() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputValue]);

  const results = useQuery(
    api.search.search,
    debouncedQuery ? { query: debouncedQuery, limit: 8 } : "skip"
  );

  const hasResults =
    results &&
    (results.accounts.length > 0 ||
      results.warriors.length > 0 ||
      results.threads.length > 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Search className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-bold">Search</h1>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search people, warriors, discussions..."
          className="pl-10"
          autoFocus
        />
      </div>

      {!debouncedQuery && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium mb-1">Find what you need</p>
          <p className="text-sm">
            Search for people, warriors, or community discussions.
          </p>
        </div>
      )}

      {debouncedQuery && results === undefined && (
        <div className="space-y-4" role="status" aria-label="Loading results">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
              <div className="h-5 w-24 bg-muted rounded mb-3" />
              <div className="h-4 w-3/4 bg-muted rounded mb-2" />
              <div className="h-4 w-1/2 bg-muted rounded" />
            </div>
          ))}
          <span className="sr-only">Loading search results</span>
        </div>
      )}

      {debouncedQuery && results && !hasResults && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium mb-1">No results found</p>
          <p className="text-sm">
            Try a different search term or check your spelling.
          </p>
        </div>
      )}

      {results && hasResults && (
        <div className="space-y-8">
          {/* People */}
          {results.accounts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  People
                </h2>
              </div>
              <div className="space-y-2">
                {results.accounts.map((account: any) => (
                  <Link
                    key={account._id}
                    href={`/profile/${account._id}`}
                  >
                    <Card className="card-hover rounded-xl">
                      <CardContent className="flex items-center gap-3 py-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={account.profilePhoto} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {account.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{account.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {account.role}
                          </p>
                        </div>
                        <User className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Warriors */}
          {results.warriors.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Warriors
                </h2>
              </div>
              <div className="space-y-2">
                {results.warriors.map((warrior: any) => (
                  <Link
                    key={warrior._id}
                    href={`/profile/${warrior.accountId}`}
                  >
                    <Card className="card-hover rounded-xl">
                      <CardContent className="flex items-center gap-3 py-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={warrior.profilePhoto} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {warrior.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{warrior.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {warrior.condition
                              ? `${warrior.condition} · `
                              : ""}
                            Family: {warrior.accountName}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="rounded-full text-xs capitalize"
                        >
                          {warrior.currentStatus}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Threads */}
          {results.threads.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Discussions
                </h2>
              </div>
              <div className="space-y-2">
                {results.threads.map((thread: any) => {
                  const cat = categoryColors[thread.category];
                  return (
                    <Link key={thread._id} href="/community">
                      <Card className="card-hover rounded-xl">
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {thread.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <span>{thread.authorName}</span>
                                <span className="flex items-center gap-0.5">
                                  <MessageCircle className="h-3 w-3" />
                                  {thread.commentCount}
                                </span>
                              </div>
                            </div>
                            {cat && (
                              <Badge
                                className={`rounded-full text-xs ${cat.bg} ${cat.text}`}
                              >
                                {thread.category}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <AuthLoading>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <Link href="/signin">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <SearchContent />
      </Authenticated>
    </>
  );
}
