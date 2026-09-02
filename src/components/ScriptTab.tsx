import { useRef, useState } from 'react';
import {
  FileText,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Hash,
  Video,
  Scissors,
  Zap,
  Type,
  Clapperboard,
} from 'lucide-react';
import { streamScript } from '@/lib/ai';
import { MarkdownRenderer } from './MarkdownRenderer';

type ScriptMode = 'full-script' | 'short-script' | 'hashtags' | 'hooks' | 'editing-tips' | 'titles';

const MODES: { id: ScriptMode; label: string; icon: React.ReactNode; desc: string; placeholder: string }[] = [
  {
    id: 'full-script',
    label: 'Full Script',
    icon: <FileText className="w-4 h-4" />,
    desc: 'Complete YouTube video script with hook, intro, content, CTA',
    placeholder: 'e.g. How to start a faceless YouTube channel in 2026',
  },
  {
    id: 'short-script',
    label: 'Short / Reel',
    icon: <Clapperboard className="w-4 h-4" />,
    desc: 'Punchy script for Shorts, Reels, or TikTok',
    placeholder: 'e.g. 3 productivity hacks that changed my life',
  },
  {
    id: 'hashtags',
    label: 'Hashtags',
    icon: <Hash className="w-4 h-4" />,
    desc: '30 viral hashtags grouped by reach',
    placeholder: 'e.g. Tech review video about budget smartphones',
  },
  {
    id: 'hooks',
    label: 'Hooks',
    icon: <Zap className="w-4 h-4" />,
    desc: '10 scroll-stopping opening hooks',
    placeholder: 'e.g. Video about personal finance for beginners',
  },
  {
    id: 'editing-tips',
    label: 'Editing Tips',
    icon: <Scissors className="w-4 h-4" />,
    desc: 'Specific editing techniques, cuts, B-roll, music',
    placeholder: 'e.g. Travel vlog editing tips for cinematic feel',
  },
  {
    id: 'titles',
    label: 'Titles',
    icon: <Type className="w-4 h-4" />,
    desc: '15 click-worthy title ideas with SEO keywords',
    placeholder: 'e.g. Video about AI tools for students',
  },
];

const SAMPLE_PROMPTS = [
  'How to start a faceless YouTube channel in 2026',
  '5 AI tools every student must know',
  'Best budget smartphones under ₹15000',
  'Morning routine that actually works',
];

export function ScriptTab() {
  const [mode, setMode] = useState<ScriptMode>('full-script');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const activeMode = MODES.find((m) => m.id === mode)!;

  const handleGenerate = () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setOutput('');
    setCopied(false);

    stopRef.current = streamScript(text, mode, {
      onChunk: (full) => setOutput(full),
      onDone: () => {
        setLoading(false);
        stopRef.current = null;
      },
    });
  };

  const handleStop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Script Writer</h2>
              <p className="text-xs text-muted">YouTube scripts, hashtags, hooks & editing tips</p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  setOutput('');
                }}
                className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                  mode === m.id
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20'
                }`}
              >
                <div className={`flex items-center gap-1.5 ${mode === m.id ? 'text-emerald-400' : 'text-muted'}`}>
                  {m.icon}
                  <span className="text-sm font-medium text-white">{m.label}</span>
                </div>
                <p className="text-[11px] text-muted leading-snug">{m.desc}</p>
              </button>
            ))}
          </div>

          {/* Empty state */}
          {!output && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted" />
              </div>
              <p className="text-sm text-muted mb-5">
                Pick a mode above, type your topic, and generate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SAMPLE_PROMPTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="text-left text-xs text-softText rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 px-3 py-2.5 transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && !output && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-sm text-muted">Writing your {activeMode.label.toLowerCase()}…</p>
            </div>
          )}

          {/* Output */}
          {output && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden animate-fade-in-up">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">{activeMode.icon}</span>
                  <span className="text-sm font-medium text-white">{activeMode.label}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="px-4 py-4">
                <MarkdownRenderer content={output} />
                {loading && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-emerald-400 align-middle animate-blink" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-3 sm:px-6 pb-4 sm:pb-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 rounded-[26px] border border-inputBorder bg-inputBg px-3 py-2 shadow-lg shadow-black/20 focus-within:border-white/25 transition-colors">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder={activeMode.placeholder}
              className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-muted/80 py-2"
              disabled={loading}
            />
            {loading ? (
              <button
                onClick={handleStop}
                className="p-2.5 rounded-full bg-white text-black hover:bg-white/90 transition-colors shrink-0 active:scale-95"
                aria-label="Stop"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shrink-0 active:scale-95"
                aria-label="Generate script"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-center text-xs text-muted/70 mt-2.5">
            Script Writer can make mistakes. Review scripts before recording.
          </p>
        </div>
      </div>
    </div>
  );
}
