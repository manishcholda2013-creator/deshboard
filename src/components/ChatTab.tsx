import { useEffect, useRef, useState } from 'react';
import { Menu, SquarePen, Zap, Cpu } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { MessageList } from '@/components/MessageList';
import { ChatInput } from '@/components/ChatInput';
import { useChats } from '@/hooks/useChats';
import { streamReply, MODELS } from '@/lib/ai';
import type { MessageContext } from '@/lib/ai';
import type { ChatMessage, FileAttachment, ModelId } from '@/types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const AUTH_KEY = 'danosu.auth.v1';
const MODEL_KEY = 'danosu.selectedModel.v1';

const MODEL_ICONS: Record<ModelId, React.ReactNode> = {
  auto: <Zap className="w-4 h-4" />,
  'gemini-3.6-flash': <Cpu className="w-4 h-4" />,
};

export function ChatTab() {
  const {
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
  } = useChats();

  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState('');
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelId>(() => {
    try {
      const stored = localStorage.getItem(MODEL_KEY);
      if (stored && stored !== 'auto' && stored !== 'gemini-3.6-flash') {
        localStorage.setItem(MODEL_KEY, 'gemini-3.6-flash');
        return 'gemini-3.6-flash';
      }
      const valid: ModelId[] = ['auto', 'gemini-3.6-flash'];
      const typed = stored as ModelId | null;
      return typed && valid.includes(typed) ? typed : 'auto';
    } catch {
      return 'auto';
    }
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    try {
      localStorage.setItem(MODEL_KEY, selectedModel);
    } catch {
      /* ignore */
    }
  }, [selectedModel]);

  useEffect(() => {
    return () => {
      stopRef.current?.();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSend = (text: string, attachment?: FileAttachment) => {
    const convId = ensureActive();
    const priorMessages = activeConversation?.messages ?? [];
    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
      attachment,
    };
    appendMessage(convId, userMsg);

    const aiId = uid();
    const aiMsg: ChatMessage = {
      id: aiId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };
    appendMessage(convId, aiMsg);
    setStreamingId(aiId);

    const history: MessageContext[] = [
      ...priorMessages,
      { role: 'user' as const, content: text },
    ].map((m) => ({ role: m.role, content: m.content }));

    const imageDataUrl = attachment?.type.startsWith('image/') ? attachment.dataUrl : undefined;

    stopRef.current = streamReply(selectedModel, history, imageDataUrl, {
      onChunk: (full) => updateMessage(convId, aiId, full),
      onDone: () => {
        setStreamingId(null);
        stopRef.current = null;
      },
      onModelSwitch: (_from, to, reason) => {
        showToast(`${reason} — switching to ${to}…`);
      },
    });
  };

  const handleStop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setStreamingId(null);
  };

  const handleRegenerate = (msgId: string) => {
    if (!activeId || streamingId) return;
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    const idx = conv.messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const prevUserMsg = [...conv.messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
    if (!prevUserMsg) return;

    removeMessagesAfter(activeId, msgId);
    const newAiId = uid();
    appendMessage(activeId, {
      id: newAiId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    });
    setStreamingId(newAiId);

    const history: MessageContext[] = conv.messages
      .slice(0, idx)
      .map((m) => ({ role: m.role, content: m.content }));

    const imageDataUrl = prevUserMsg.attachment?.type.startsWith('image/')
      ? prevUserMsg.attachment.dataUrl
      : undefined;

    stopRef.current = streamReply(selectedModel, history, imageDataUrl, {
      onChunk: (full) => updateMessage(activeId, newAiId, full),
      onDone: () => {
        setStreamingId(null);
        stopRef.current = null;
      },
      onModelSwitch: (_from, to, reason) => {
        showToast(`${reason} — switching to ${to}…`);
      },
    });
  };

  const handlePick = (text: string) => {
    handleSend(text);
  };

  const toggleSidebar = () => setCollapsed((v) => !v);

  return (
    <div className="flex flex-1 min-h-0">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={collapsed}
        onNewChat={() => {
          newChat();
          if (collapsed) setCollapsed(false);
        }}
        onSelect={(id) => {
          selectChat(id);
          if (window.innerWidth < 640) setCollapsed(true);
        }}
        onDelete={deleteChat}
        onClearAll={clearAll}
        onToggle={toggleSidebar}
      />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with model selector */}
        <header className="flex items-center justify-between px-3 sm:px-5 h-14 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-softText truncate">
              {activeConversation?.title ?? 'Danosu AI'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Model selector dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs text-softText hover:text-white transition-all duration-150">
                {MODEL_ICONS[selectedModel]}
                <span className="hidden sm:inline">{MODELS.find((m) => m.id === selectedModel)?.label}</span>
                <span className="sm:hidden">Model</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-white/10 bg-[#1e1e1e] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="p-1.5">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`w-full flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                        selectedModel === m.id ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="mt-0.5 text-muted">{MODEL_ICONS[m.id]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${selectedModel === m.id ? 'text-white' : 'text-softText'}`}>
                            {m.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-muted">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">{m.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={newChat}
              className="p-2 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors sm:hidden"
              aria-label="New chat"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0">
          {messages.length === 0 ? (
            <WelcomeScreen onPick={handlePick} />
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <MessageList messages={messages} streamingId={streamingId} onRegenerate={handleRegenerate} />
            </div>
          )}

          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            streaming={streamingId !== null}
            disabled={streamingId !== null}
            draft={draft}
            setDraft={setDraft}
            acceptImages
          />
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-24 right-4 z-[80] animate-fade-in-up">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#2a2a2a] px-3.5 py-3 shadow-2xl max-w-sm">
            <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-accent animate-pulse" />
            </div>
            <p className="text-sm text-white">{toastMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
