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

  // Handle ?to=accountId parameter - find or create conversation with that user
  useEffect(() => {
    async function handleToParameter() {
      if (!toAccountId || !conversations || hasHandledToParam.current) return;

      hasHandledToParam.current = true;

      // Find existing conversation with this user
      const existingConversation = conversations.find((conv) =>
        conv.participants?.some((p) => p?._id?.toString() === toAccountId)
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
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversation List */}
        <Card className="md:col-span-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
              {conversations && conversations.length > 0 ? (
                conversations.map((conv) => {
                  const otherParticipant = conv.participants?.find(
                    (p) => p !== null
                  );
                  const initials = otherParticipant?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?";

                  return (
                    <button
                      key={conv._id}
                      onClick={() => handleSelectConversation(conv._id.toString())}
                      className={cn(
                        "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                        selectedConversationId === conv._id.toString() && "bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherParticipant?.profilePhoto} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className="font-medium truncate">
                              {conv.name || otherParticipant?.name || "Unknown"}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No conversations yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg">
                  {selectedConversation.name ||
                    selectedConversation.participants
                      ?.map((p) => p?.name)
                      .filter(Boolean)
                      .join(", ")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages?.map((message) => (
                  <div
                    key={message._id}
                    className={cn(
                      "flex gap-3",
                      message.senderId === selectedConversation.participants?.[0]?._id
                        ? "flex-row-reverse"
                        : ""
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.senderPhoto} />
                      <AvatarFallback className="text-xs">
                        {message.senderName?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-4 py-2",
                        message.senderId === selectedConversation.participants?.[0]?._id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isSending}
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation to start messaging
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
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
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
        <MessagesContent />
      </Authenticated>
    </>
  );
}
