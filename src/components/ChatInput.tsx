import { useEffect, useRef, useState } from 'react';
import { Paperclip, Mic, ArrowUp, Square, X, FileText, ImageIcon } from 'lucide-react';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import type { FileAttachment } from '@/types';

interface ChatInputProps {
  onSend: (text: string, attachment?: FileAttachment) => void;
  disabled?: boolean;
  onStop?: () => void;
  streaming?: boolean;
  draft: string;
  setDraft: (v: string) => void;
  acceptImages?: boolean;
}

export function ChatInput({
  onSend,
  disabled,
  onStop,
  streaming,
  draft,
  setDraft,
  acceptImages = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);

  const { listening, supported, start, stop } = useSpeechToText((text) => {
    setDraft(text);
  });

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [draft]);

  const handleSend = () => {
    const text = draft.trim();
    if ((!text && !attachment) || disabled) return;
    onSend(text, attachment ?? undefined);
    setDraft('');
    setAttachment(null);
    stop();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (!supported) return;
    if (listening) {
      stop();
    } else {
      setDraft('');
      start();
      textareaRef.current?.focus();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: isImage ? (reader.result as string) : undefined,
      });
    };
    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      setAttachment({ name: file.name, size: file.size, type: file.type });
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isImage = attachment?.type.startsWith('image/');

  return (
    <div className="px-3 sm:px-6 pb-4 sm:pb-6">
      <div className="w-full max-w-3xl mx-auto">
        {/* File badge */}
        {attachment && (
          <div className="mb-2 flex justify-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-inputBg border border-white/10 pl-2.5 pr-1.5 py-1.5 max-w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  {isImage ? (
                    <ImageIcon className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-accent" />
                  )}
                </div>
                <span className="text-sm text-softText truncate max-w-[180px]">{attachment.name}</span>
                <span className="text-xs text-muted shrink-0">{(attachment.size / 1024).toFixed(0)} KB</span>
              </div>
              <button
                onClick={removeAttachment}
                className="p-1 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors shrink-0"
                aria-label="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-[26px] border border-inputBorder bg-inputBg px-2.5 py-2 shadow-lg shadow-black/20 transition-colors focus-within:border-white/25">
          {/* Attachment */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full text-muted hover:text-white hover:bg-white/5 transition-colors shrink-0"
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept={acceptImages ? 'image/*' : undefined}
            className="hidden"
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder={listening ? 'Listening… speak now' : 'Message CodeFlex AI…'}
            className="flex-1 bg-transparent resize-none outline-none text-[15px] text-white placeholder:text-muted/80 py-2.5 max-h-[200px] scrollbar-thin"
          />

          {/* Mic */}
          <button
            onClick={toggleMic}
            disabled={!supported}
            className={`p-2.5 rounded-full transition-all duration-300 shrink-0 ${
              listening
                ? 'text-accent animate-glow-pulse bg-accent/10'
                : 'text-muted hover:text-white hover:bg-white/5'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            aria-label="Voice input"
            title={
              !supported
                ? 'Voice input not supported in this browser'
                : listening
                ? 'Stop listening'
                : 'Start voice input'
            }
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send / Stop */}
          {streaming ? (
            <button
              onClick={onStop}
              className="p-2.5 rounded-full bg-white text-black hover:bg-white/90 transition-colors shrink-0"
              aria-label="Stop"
            >
              <Square className="w-4 h-4 fill-black" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || (!draft.trim() && !attachment)}
              className="p-2.5 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shrink-0 active:scale-95"
              aria-label="Send message"
            >
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
        <p className="text-center text-xs text-muted/70 mt-2.5">
          CodeFlex AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
}
