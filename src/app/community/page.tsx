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
import { GradientHeader, ContentPanel } from "@/components/gradient-header";
import { MessageSquare, Plus, Sparkles, MessageCircle, Eye, Flag, Pin, Lock, Trash2, Shield } from "lucide-react";

type Category = "general" | "support" | "resources" | "celebrations" | "questions";

const categoryLabels: Record<Category, { label: string; bg: string; text: string; border: string; gradient: string }> = {
  general: { label: "General", bg: "bg-gray-100", text: "text-gray-700", border: "border-l-gray-400", gradient: "from-gray-400 to-gray-500" },
  support: { label: "Support", bg: "bg-purple-100", text: "text-purple-700", border: "border-l-purple-400", gradient: "from-purple-400 to-purple-600" },
  resources: { label: "Resources", bg: "bg-blue-100", text: "text-blue-700", border: "border-l-blue-400", gradient: "from-blue-400 to-blue-600" },
  celebrations: { label: "Celebrations", bg: "bg-green-100", text: "text-green-700", border: "border-l-green-400", gradient: "from-green-400 to-emerald-500" },
  questions: { label: "Questions", bg: "bg-amber-100", text: "text-amber-700", border: "border-l-amber-400", gradient: "from-amber-400 to-orange-400" },
};

function ThreadAvatar({ category, authorName, authorPhoto }: { category: string; authorName?: string; authorPhoto?: string }) {
  const cat = categoryLabels[category as Category];
  if (authorPhoto) {
    return (
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={authorPhoto} />
        <AvatarFallback className={cn("text-white text-sm font-semibold bg-gradient-to-br", cat?.gradient ?? "from-gray-400 to-gray-500")}>
          {authorName?.[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
    );
  }
  return (
    <div className={cn("h-10 w-10 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold", cat?.gradient ?? "from-gray-400 to-gray-500")}>
      {authorName?.[0] ?? "?"}
    </div>
  );
}

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
    <>
      {/* Gradient Header */}
      <GradientHeader>
        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="section-label opacity-80 mb-1">Connect &amp; Share</p>
            <h1 className="font-heading text-2xl font-semibold text-white">Community</h1>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-1.5 rounded-full bg-white/20 text-white border-white/30 hover:bg-white/30">
                <Plus className="h-4 w-4" />
                New Discussion
              </Button>
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
      </GradientHeader>

      <ContentPanel>
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
          {/* Thread List — timeline layout */}
          <div>
            {threads === undefined ? (
              <div className="space-y-0" role="status" aria-label="Loading discussions">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 py-4 border-b border-border animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-3/4 bg-muted rounded" />
                      <div className="h-4 w-full bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                ))}
                <span className="sr-only">Loading discussions</span>
              </div>
            ) : threads.length > 0 ? (
              <div className="divide-y divide-border">
                {threads.map((thread) => {
                  const cat = categoryLabels[thread.category as Category];
                  const isSelected = selectedThreadId === thread._id.toString();
                  return (
                    <button
                      key={thread._id}
                      className={cn(
                        "flex gap-3 py-4 w-full text-left transition-colors hover:bg-muted/40 rounded-lg px-2 -mx-2",
                        isSelected && "bg-primary/5"
                      )}
                      onClick={() => setSelectedThreadId(thread._id.toString())}
                    >
                      <ThreadAvatar
                        category={thread.category}
                        authorName={thread.authorName}
                        authorPhoto={thread.authorPhoto}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {thread.isPinned && (
                            <Badge variant="secondary" className="rounded-full text-xs px-2 py-0">Pinned</Badge>
                          )}
                          <span className={cn("text-xs font-medium rounded-full px-2 py-0.5", cat?.bg, cat?.text)}>
                            {cat?.label}
                          </span>
                        </div>
                        <p className="font-heading font-semibold text-sm leading-snug truncate">
                          {thread.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {thread.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{thread.authorName}</span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {thread.commentCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {thread.viewCount}
                          </span>
                          <span className="ml-auto">
                            {new Date(thread.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
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
                  <CardTitle className="font-heading">{selectedThread.title}</CardTitle>
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

                  {/* Comments section — timeline layout */}
                  <div className="border-t pt-4">
                    <p className="section-label mb-4">
                      Comments ({selectedThread.comments?.length || 0})
                    </p>

                    {selectedThread.isLocked ? (
                      <p className="text-sm text-muted-foreground mb-4 italic">
                        This thread is locked and no longer accepting comments.
                      </p>
                    ) : (
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
                    )}

                    <div className="space-y-0 max-h-[300px] overflow-y-auto divide-y divide-border">
                      {selectedThread.comments?.map((comment: any) => (
                        <div key={comment._id} className="flex gap-2.5 py-3">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={comment.authorPhoto} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-amber-300 to-orange-400 text-white font-semibold">
                              {comment.authorName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold">{comment.authorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      {(!selectedThread.comments || selectedThread.comments.length === 0) && (
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
      </ContentPanel>
    </>
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
