"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CommunitySkeleton } from "@/components/skeleton-loaders";
import { MessageSquare, Plus, Sparkles, MessageCircle, Eye, Flag, Pin, Lock, Trash2, Shield } from "lucide-react";

type Category = "general" | "support" | "resources" | "celebrations" | "questions";

const categoryLabels: Record<Category, { label: string; bg: string; text: string; border: string }> = {
  general: { label: "General", bg: "bg-gray-100", text: "text-gray-700", border: "border-l-gray-400" },
  support: { label: "Support", bg: "bg-purple-100", text: "text-purple-700", border: "border-l-purple-400" },
  resources: { label: "Resources", bg: "bg-blue-100", text: "text-blue-700", border: "border-l-blue-400" },
  celebrations: { label: "Celebrations", bg: "bg-green-100", text: "text-green-700", border: "border-l-green-400" },
  questions: { label: "Questions", bg: "bg-amber-100", text: "text-amber-700", border: "border-l-amber-400" },
};

function CommunityContent() {
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const threads = useQuery(api.threads.getThreads, {
    category: selectedCategory === "all" ? undefined : selectedCategory,
    sortBy,
    limit: 50,
  });

  const createThread = useMutation(api.threads.createThread);
  const addComment = useMutation(api.threads.addComment);
  const submitReport = useMutation(api.moderation.submitReport);
  const togglePin = useMutation(api.moderation.togglePinThread);
  const toggleLock = useMutation(api.moderation.toggleLockThread);
  const adminDeleteThread = useMutation(api.moderation.adminDeleteThread);
  const isAdmin = useQuery(api.moderation.isCurrentUserAdmin);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("general");
  const [isCreating, setIsCreating] = useState(false);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const selectedThread = useQuery(
    api.threads.getThread,
    selectedThreadId ? { threadId: selectedThreadId as any } : "skip"
  );

  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const handleReport = async () => {
    if (!reportReason.trim() || !selectedThreadId) return;
    setIsReporting(true);
    try {
      await submitReport({
        targetType: "thread",
        targetId: selectedThreadId,
        reason: reportReason.trim(),
      });
      toast.success("Report submitted. Thank you for helping keep our community safe.");
      setReportReason("");
      setIsReportOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };

  const handleTogglePin = async () => {
    if (!selectedThreadId) return;
    try {
      const result = await togglePin({ threadId: selectedThreadId as any });
      toast.success(result.isPinned ? "Thread pinned" : "Thread unpinned");
    } catch (error) {
      toast.error("Failed to update thread");
    }
  };

  const handleToggleLock = async () => {
    if (!selectedThreadId) return;
    try {
      const result = await toggleLock({ threadId: selectedThreadId as any });
      toast.success(result.isLocked ? "Thread locked" : "Thread unlocked");
    } catch (error) {
      toast.error("Failed to update thread");
    }
  };

  const handleAdminDelete = async () => {
    if (!selectedThreadId) return;
    if (!confirm("Are you sure you want to delete this thread? This cannot be undone.")) return;
    try {
      await adminDeleteThread({ threadId: selectedThreadId as any });
      toast.success("Thread deleted");
      setSelectedThreadId(null);
    } catch (error) {
      toast.error("Failed to delete thread");
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsCreating(true);
    try {
      await createThread({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
      });
      toast.success("Thread created successfully");
      setNewTitle("");
      setNewContent("");
      setIsCreateOpen(false);
    } catch (error) {
      toast.error("Failed to create thread");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedThreadId) return;

    setIsCommenting(true);
    try {
      await addComment({
        threadId: selectedThreadId as any,
        content: newComment.trim(),
      });
      setNewComment("");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Community</h1>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-1.5"><Plus className="h-4 w-4" />New Discussion</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Start a New Discussion</DialogTitle>
              <DialogDescription>Create a new community discussion thread.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newCategory}
                  onValueChange={(v) => setNewCategory(v as Category)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={5}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Post"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            selectedCategory === "all"
              ? "bg-gray-800 text-white"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
          )}
          onClick={() => setSelectedCategory("all")}
        >
          All
        </button>
        {(Object.entries(categoryLabels) as [Category, typeof categoryLabels[Category]][]).map(([key, { label, bg, text }]) => (
          <button
            key={key}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              selectedCategory === key
                ? cn(bg, text)
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
            )}
            onClick={() => setSelectedCategory(key)}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as "recent" | "popular")}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Thread List */}
        <div className="space-y-4">
          {threads === undefined ? (
            <div className="space-y-4" role="status" aria-label="Loading discussions">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-16 bg-muted rounded" />
                    <div className="h-5 w-20 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-muted rounded mb-2" />
                  <div className="h-4 w-full bg-muted rounded mb-1" />
                  <div className="h-4 w-2/3 bg-muted rounded" />
                </div>
              ))}
              <span className="sr-only">Loading discussions</span>
            </div>
          ) : threads.length > 0 ? (
            threads.map((thread) => {
              const cat = categoryLabels[thread.category as Category];
              return (
              <Card
                key={thread._id}
                className={cn(
                  "cursor-pointer card-hover border-l-4 rounded-xl",
                  cat?.border,
                  selectedThreadId === thread._id.toString()
                    ? "ring-2 ring-primary shadow-md"
                    : "hover:shadow-md"
                )}
                onClick={() => setSelectedThreadId(thread._id.toString())}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {thread.isPinned && <Badge variant="secondary" className="rounded-full">Pinned</Badge>}
                      <Badge
                        className={cn(
                          "rounded-full font-medium",
                          cat?.bg,
                          cat?.text
                        )}
                      >
                        {cat?.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{thread.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {thread.content}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={thread.authorPhoto} />
                        <AvatarFallback className="text-xs">
                          {thread.authorName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      {thread.authorName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {thread.commentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {thread.viewCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
              );
            })
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-lg font-medium mb-1">No discussions yet</p>
              <p className="text-sm">Start the first conversation and bring the community together!</p>
            </div>
          )}
        </div>

        {/* Thread Detail */}
        <Card className="h-fit sticky top-20 rounded-xl">
          {selectedThread ? (
            <>
              <CardHeader>
                <Badge
                  className={cn(
                    "w-fit rounded-full font-medium",
                    categoryLabels[selectedThread.category as Category]?.bg,
                    categoryLabels[selectedThread.category as Category]?.text
                  )}
                >
                  {categoryLabels[selectedThread.category as Category]?.label}
                </Badge>
                <CardTitle>{selectedThread.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedThread.authorPhoto} />
                    <AvatarFallback className="text-xs">
                      {selectedThread.authorName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>{selectedThread.authorName}</span>
                  <span>
                    {new Date(selectedThread.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap">{selectedThread.content}</p>

                {/* Action buttons */}
                <div className="flex items-center gap-2 border-t pt-3">
                  {/* Report button */}
                  <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
                        <Flag className="h-3.5 w-3.5" />
                        Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report Thread</DialogTitle>
                        <DialogDescription>
                          Help us keep the community safe. Please describe why you&apos;re reporting this thread.
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Reason for reporting..."
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsReportOpen(false)}>Cancel</Button>
                        <Button
                          variant="destructive"
                          onClick={handleReport}
                          disabled={isReporting || !reportReason.trim()}
                        >
                          {isReporting ? "Submitting..." : "Submit Report"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {selectedThread.isLocked && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" /> Locked
                    </Badge>
                  )}

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Shield className="h-3 w-3" /> Admin
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={handleTogglePin} title={selectedThread.isPinned ? "Unpin" : "Pin"}>
                        <Pin className={cn("h-3.5 w-3.5", selectedThread.isPinned && "text-primary")} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleToggleLock} title={selectedThread.isLocked ? "Unlock" : "Lock"}>
                        <Lock className={cn("h-3.5 w-3.5", selectedThread.isLocked && "text-orange-500")} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleAdminDelete} title="Delete thread" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-4">
                    Comments ({selectedThread.comments?.length || 0})
                  </h4>

                  <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      disabled={isCommenting}
                    />
                    <Button
                      type="submit"
                      disabled={isCommenting || !newComment.trim()}
                    >
                      Post
                    </Button>
                  </form>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {selectedThread.comments?.map((comment: any) => (
                      <div
                        key={comment._id}
                        className="p-3 rounded-xl bg-amber-50/50 border border-amber-100/50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={comment.authorPhoto} />
                            <AvatarFallback className="text-xs">
                              {comment.authorName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {comment.authorName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                    {(!selectedThread.comments ||
                      selectedThread.comments.length === 0) && (
                      <div className="text-center py-6">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 text-amber-300" />
                        <p className="text-sm text-muted-foreground">
                          No comments yet. Be the first to share your thoughts!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-20 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">Select a discussion</p>
              <p className="text-sm mt-1">Choose a thread from the left to view details and join the conversation.</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <>
      <AuthLoading>
        <CommunitySkeleton />
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
        <CommunityContent />
      </Authenticated>
    </>
  );
}
