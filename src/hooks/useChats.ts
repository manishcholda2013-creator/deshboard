import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, Conversation } from '@/types';

const STORAGE_KEY = 'danosu.chats.v1';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function persist(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    /* ignore quota errors */
  }
}

function deriveTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 36 ? clean.slice(0, 36) + '…' : clean || 'New chat';
}

export function useChats() {
  const [conversations, setConversations] = useState<Conversation[]>(() => load());
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  useEffect(() => {
    persist(conversations);
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const newChat = useCallback(() => {
    const conv: Conversation = {
      id: uid(),
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    return conv.id;
  }, []);

  const selectChat = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeRef.current === id) {
          setActiveId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    []
  );

  const clearAll = useCallback(() => {
    setConversations([]);
    setActiveId(null);
  }, []);

  const appendMessage = useCallback((convId: string, message: ChatMessage) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const isFirstUser =
          message.role === 'user' && c.messages.length === 0;
        return {
          ...c,
          title: isFirstUser ? deriveTitle(message.content) : c.title,
          messages: [...c.messages, message],
          updatedAt: Date.now(),
        };
      })
    );
  }, []);

  const updateMessage = useCallback(
    (convId: string, messageId: string, content: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, content } : m
                ),
                updatedAt: Date.now(),
              }
        )
      );
    },
    []
  );

  const removeMessagesAfter = useCallback(
    (convId: string, messageId: string) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const idx = c.messages.findIndex((m) => m.id === messageId);
          if (idx === -1) return c;
          return {
            ...c,
            messages: c.messages.slice(0, idx + 1),
            updatedAt: Date.now(),
          };
        })
      );
    },
    []
  );

  const ensureActive = useCallback((): string => {
    if (activeRef.current) return activeRef.current;
    return newChat();
  }, [newChat]);

  return {
    conversations,
    activeId,
    activeConversation,
    newChat,
    selectChat,
    deleteChat,
    clearAll,
    appendMessage,
    updateMessage,
    removeMessagesAfter,
    ensureActive,
  };
}
