"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MessagesSkeleton } from "@/components/skeleton-loaders";
import { MessageCircle, Send, Inbox } from "lucide-react";

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toAccountId = searchParams.get("to");

  const conversationsData = useQuery(api.messages.getMyConversations, {});
  const conversations = conversationsData && !Array.isArray(conversationsData)
    ? conversationsData.conversations
    : undefined;
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversation = useQuery(
    api.messages.getConversation,
    selectedConversationId ? { conversationId: selectedConversationId as any } : "skip"
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markAsRead);
  const startConversation = useMutation(api.messages.startConversation);

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const hasHandledToParam = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle ?to=accountId parameter - find or create conversation with that user
  useEffect(() => {
    async function handleToParameter() {
      if (!toAccountId || !conversations || hasHandledToParam.current) return;

      hasHandledToParam.current = true;

      // Find existing conversation with this user
      const existingConversation = conversations.find((conv) =>
        conv.participants?.some((p: any) => p?._id?.toString() === toAccountId)
      );

      if (existingConversation) {
        setSelectedConversationId(existingConversation._id.toString());
        await markAsRead({ conversationId: existingConversation._id as any });
      } else {
        // Create new conversation with this user
        try {
          const newConversationId = await startConversation({
            participantIds: [toAccountId as any],
          });
          setSelectedConversationId(newConversationId.toString());
        } catch (error) {
          console.error("Failed to start conversation:", error);
        }
      }

      // Clear the ?to param from URL to prevent re-processing
      router.replace("/messages");
    }

    handleToParameter();
  }, [toAccountId, conversations, markAsRead, startConversation, router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    await markAsRead({ conversationId: conversationId as any });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversationId) return;

    setIsSending(true);
    try {
      await sendMessage({
        conversationId: selectedConversationId as any,
        content: newMessage.trim(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Loading state
  if (conversationsData === undefined) {
    return <MessagesSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Messages</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversation List */}
        <Card className="md:col-span-1 overflow-hidden border-0 shadow-md bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {conversations && conversations.length > 0 ? (
                conversations.map((conv) => {
                  const otherParticipant = conv.participants?.find(
                    (p: any) => p !== null
                  );
                  const initials = otherParticipant?.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?";
                  const isSelected = selectedConversationId === conv._id.toString();
                  const hasUnread = conv.unreadCount > 0;

                  return (
                    <button
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv._id.toString())}
                      className={cn(
                        "w-full p-4 text-left transition-all duration-200 border-b border-border/30 last:border-b-0",
                        isSelected
                          ? "bg-primary/8 border-l-3 border-l-primary"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className={cn(
                            "h-11 w-11 ring-2 transition-all",
                            isSelected ? "ring-primary/30" : "ring-transparent"
                          )}>
                            <AvatarImage src={otherParticipant?.profilePhoto} />
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {hasUnread && (
                            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-blue-500 ring-2 ring-card" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className={cn(
                              "truncate",
                              hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"
                            )}>
                              {conv.name || otherParticipant?.name || "Unknown"}
                            </p>
                            {hasUnread && (
                              <span className="bg-blue-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className={cn(
                              "text-sm truncate mt-0.5",
                              hasUnread ? "text-foreground/70 font-medium" : "text-muted-foreground"
                            )}>
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <Inbox className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-muted-foreground mb-1">No conversations yet</p>
                  <p className="text-sm text-muted-foreground/70">
                    Visit a profile and send a message to get started
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden border-0 shadow-md bg-card/80 backdrop-blur-sm">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  {(() => {
                    const participant = selectedConversation.participants?.find(p => p !== null);
                    const initials = participant?.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "?";
                    return (
                      <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                        <AvatarImage src={participant?.profilePhoto} />
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })()}
                  <CardTitle className="text-lg font-semibold">
                    {selectedConversation.name ||
                      selectedConversation.participants
                        ?.map((p) => p?.name)
                        .filter(Boolean)
                        .join(", ")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-3 bg-muted/20">
                {selectedConversation.messages?.map((message, index) => {
                  const isSent = message.senderId === selectedConversation.participants?.[0]?._id;
                  const showAvatar =
                    index === 0 ||
                    selectedConversation.messages?.[index - 1]?.senderId !== message.senderId;

                  return (
                    <div
                      key={message._id}
                      className={cn(
                        "flex gap-2.5 items-end",
                        isSent ? "flex-row-reverse" : ""
                      )}
                    >
                      {!isSent && showAvatar ? (
                        <Avatar className="h-7 w-7 mb-5">
                          <AvatarImage src={message.senderPhoto} />
                          <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
                            {message.senderName?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ) : !isSent ? (
                        <div className="w-7" />
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[70%] px-4 py-2.5 transition-colors",
                          isSent
                            ? "bg-primary/10 text-foreground rounded-2xl rounded-br-md"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-md"
                        )}
                      >
                        {!isSent && showAvatar && (
                          <p className="text-xs font-semibold text-primary/70 mb-0.5">
                            {message.senderName}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          isSent ? "text-primary/50 text-right" : "text-muted-foreground/60"
                        )}>
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </CardContent>
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-border/50 flex gap-2 bg-card"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="rounded-full border-border/50 bg-muted/30 focus-visible:ring-primary/30 px-4"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isSending || !newMessage.trim()}
                  className="rounded-full h-10 w-10 shrink-0 transition-all duration-200 hover:scale-105 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="p-5 rounded-full bg-primary/5 mb-5">
                <MessageCircle className="h-12 w-12 text-primary/30" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/80 mb-2">
                Select a conversation
              </h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Choose a conversation from the list to start messaging, or visit someone&apos;s profile to start a new one.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <>
      <AuthLoading>
        <MessagesSkeleton />
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
        <MessagesContent />
      </Authenticated>
    </>
  );
}
