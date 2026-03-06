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

type Category = "general" | "support" | "resources" | "celebrations" | "questions";

const categoryLabels: Record<Category, { label: string; color: string }> = {
  general: { label: "General", color: "bg-gray-500" },
  support: { label: "Support", color: "bg-purple-500" },
  resources: { label: "Resources", color: "bg-blue-500" },
  celebrations: { label: "Celebrations", color: "bg-green-500" },
  questions: { label: "Questions", color: "bg-amber-500" },
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
        <h1 className="text-3xl font-bold">Community</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>New Discussion</Button>
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
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
        >
          All
        </Button>
        {Object.entries(categoryLabels).map(([key, { label }]) => (
          <Button
            key={key}
            variant={selectedCategory === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(key as Category)}
          >
            {label}
          </Button>
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
            threads.map((thread) => (
              <Card
                key={thread._id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-shadow",
                  selectedThreadId === thread._id.toString() && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedThreadId(thread._id.toString())}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {thread.isPinned && <Badge variant="secondary">Pinned</Badge>}
                      <Badge
                        className={cn(
                          "text-white",
                          categoryLabels[thread.category as Category]?.color
                        )}
                      >
                        {categoryLabels[thread.category as Category]?.label}
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
                    <span>{thread.commentCount} comments</span>
                    <span>{thread.viewCount} views</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No discussions yet. Start the first one!
            </div>
          )}
        </div>

        {/* Thread Detail */}
        <Card className="h-fit sticky top-20">
          {selectedThread ? (
            <>
              <CardHeader>
                <Badge
                  className={cn(
                    "w-fit text-white",
                    categoryLabels[selectedThread.category as Category]?.color
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
                        className="p-3 rounded-lg bg-muted/50"
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
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No comments yet. Be the first to share your thoughts!
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-20 text-center text-muted-foreground">
              Select a discussion to view details
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
