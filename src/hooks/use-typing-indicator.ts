"use client";

import { useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const TYPING_DEBOUNCE_MS = 1500;

export function useTypingIndicator(conversationId: string | null) {
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);
  const typingUsers = useQuery(
    api.typing.getTypingUsers,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTyping = useCallback(() => {
    if (!conversationId) return;

    // Send typing indicator
    setTyping({ conversationId: conversationId as Id<"conversations"> });

    // Clear the existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to clear typing after debounce period
    timeoutRef.current = setTimeout(() => {
      clearTyping({ conversationId: conversationId as Id<"conversations"> });
    }, TYPING_DEBOUNCE_MS);
  }, [conversationId, setTyping, clearTyping]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    clearTyping({ conversationId: conversationId as Id<"conversations"> });
  }, [conversationId, clearTyping]);

  return {
    handleTyping,
    stopTyping,
    typingUsers: typingUsers || [],
  };
}
