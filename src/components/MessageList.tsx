import { useEffect, useRef, useState } from 'react';
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, FileText, ImageIcon } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { Waveform } from './Waveform';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageListProps {
  messages: ChatMessage[];
  streamingId: string | null;
  onRegenerate?: (msgId: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-white/8 text-muted hover:text-white transition-colors"
      aria-label="Copy message"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function FeedbackButtons() {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  return (
    <>
      <button
        onClick={() => setVote(vote === 'up' ? null : 'up')}
        className={`p-1.5 rounded-md hover:bg-white/8 transition-colors ${
          vote === 'up' ? 'text-accent' : 'text-muted hover:text-white'
        }`}
        aria-label="Good response"
        title="Good response"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setVote(vote === 'down' ? null : 'down')}
        className={`p-1.5 rounded-md hover:bg-white/8 transition-colors ${
          vote === 'down' ? 'text-red-400' : 'text-muted hover:text-white'
        }`}
        aria-label="Bad response"
        title="Bad response"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </>
  );
}

function AttachmentPreview({ name, size, dataUrl }: { name: string; size: number; dataUrl?: string }) {
  const isImage = dataUrl?.startsWith('data:image');
  return (
    <div className="mb-1.5">
      {isImage && dataUrl ? (
        <img
          src={dataUrl}
          alt={name}
          className="rounded-xl max-w-[220px] max-h-[220px] border border-white/10 object-cover"
        />
      ) : (
        <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5">
          <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
            <FileText className="w-3 h-3 text-accent" />
          </div>
          <span className="text-xs text-softText truncate max-w-[160px]">{name}</span>
          <span className="text-xs text-muted shrink-0">{(size / 1024).toFixed(0)} KB</span>
        </div>
      )}
    </div>
  );
}

export function MessageList({ messages, streamingId, onRegenerate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streamingId]);

  const lastAssistantIdx = messages.reduce(
    (acc, m, i) => (m.role === 'assistant' ? i : acc),
    -1
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {messages.map((m, idx) => {
        const isUser = m.role === 'user';
        const isStreaming = m.id === streamingId;
        const isLastAssistant = idx === lastAssistantIdx;

        return (
          <div
            key={m.id}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
          >
            <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white ${
                  isUser
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                    : 'bg-gradient-to-br from-violet-500 to-purple-600'
                }`}
              >
                {isUser ? 'D' : 'AI'}
              </div>

              {/* Bubble + actions */}
              <div className="flex flex-col gap-1.5">
                {m.attachment && (
                  <AttachmentPreview name={m.attachment.name} size={m.attachment.size} dataUrl={m.attachment.dataUrl} />
                )}
                <div
                  className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed break-words ${
                    isUser
                      ? 'bg-userBubble text-white rounded-tr-sm whitespace-pre-wrap'
                      : 'bg-transparent text-softText rounded-tl-sm'
                  }`}
                >
                  {isUser ? (
                    m.content
                  ) : (
                    <MarkdownRenderer content={m.content} />
                  )}
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-violet-400 align-middle animate-blink" />
                  )}
                </div>

                {/* Model badge */}
                {!isUser && !isStreaming && m.content.length > 0 && m.model && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted/70 mt-0.5">
                    <ImageIcon className="w-2.5 h-2.5" />
                    {m.model}
                  </span>
                )}

                {/* Action bar */}
                {!isStreaming && m.content.length > 0 && (
                  <div
                    className={`flex items-center gap-0.5 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <CopyButton text={m.content} />
                    {!isUser && (
                      <>
                        <FeedbackButtons />
                        {isLastAssistant && onRegenerate && (
                          <button
                            onClick={() => onRegenerate(m.id)}
                            className="p-1.5 rounded-md hover:bg-white/8 text-muted hover:text-white transition-colors"
                            aria-label="Regenerate response"
                            title="Regenerate"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Thinking indicator */}
      {messages.length > 0 &&
        messages[messages.length - 1].role === 'user' &&
        !streamingId && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-semibold text-white">
                AI
              </div>
              <div className="flex items-end pb-1">
                <Waveform bars={18} className="h-6 w-28 opacity-70" />
              </div>
            </div>
          </div>
        )}

      <div ref={bottomRef} />
    </div>
  );
}
