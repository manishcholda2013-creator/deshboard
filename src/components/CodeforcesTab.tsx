import { useRef, useState } from 'react';
import {
  Code2,
  Loader2,
  Copy,
  Check,
  Trophy,
  Flame,
  Send,
  FileCode,
} from 'lucide-react';
import { streamCodeforces } from '@/lib/ai';
import { MarkdownRenderer } from './MarkdownRenderer';

type Lang = 'cpp' | 'python' | 'java';
type Difficulty = '800-1500' | '1500-2000' | '2000-2500' | '2500-3000' | '3000+';

const LANGS: { id: Lang; label: string }[] = [
  { id: 'cpp', label: 'C++' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
];

const DIFFICULTIES: { id: Difficulty; label: string; icon: React.ReactNode; color: string }[] = [
  { id: '800-1500', label: 'Easy', icon: <Trophy className="w-3.5 h-3.5" />, color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  { id: '1500-2000', label: 'Medium', icon: <Trophy className="w-3.5 h-3.5" />, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
  { id: '2000-2500', label: 'Hard', icon: <Flame className="w-3.5 h-3.5" />, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  { id: '2500-3000', label: 'Expert', icon: <Flame className="w-3.5 h-3.5" />, color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { id: '3000+', label: 'Legendary', icon: <Flame className="w-3.5 h-3.5" />, color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10' },
];

const SAMPLE_PROBLEMS = [
  {
    title: 'Two Sum (A+B Problem)',
    text: 'Given an array of n integers, find two indices i and j (i != j) such that a[i] + a[j] = x. n <= 2*10^5, a[i] <= 10^9.',
    diff: '800-1500' as Difficulty,
  },
  {
    title: 'Dynamic Programming on Trees',
    text: 'Given a tree with n nodes (n <= 10^5), each node has a value. Find the maximum independent set (no two selected nodes are adjacent). Output the maximum sum of values.',
    diff: '2000-2500' as Difficulty,
  },
  {
    title: 'Matrix Game (Game Theory)',
    text: 'Two players play a game on an n x m grid. Each cell has a value. Players take turns picking a cell from the first row. They can only pick cells not yet picked. The game ends when all cells are taken. Both play optimally. Find who wins and the score difference. n,m <= 1000.',
    diff: '2500-3000' as Difficulty,
  },
  {
    title: 'Centroid Decomposition + FFT',
    text: 'Given a tree with n nodes (n <= 2*10^5), count the number of paths of each length from 1 to n. Use centroid decomposition with FFT for convolution. Output count[k] for each k.',
    diff: '3000+' as Difficulty,
  },
];

export function CodeforcesTab() {
  const [problemText, setProblemText] = useState('');
  const [language, setLanguage] = useState<Lang>('cpp');
  const [difficulty, setDifficulty] = useState<Difficulty>('2000-2500');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const activeDiff = DIFFICULTIES.find((d) => d.id === difficulty)!;

  const handleSolve = () => {
    const text = problemText.trim();
    if (!text || loading) return;
    setLoading(true);
    setOutput('');
    setCopied(false);

    const diffLabel = activeDiff.label;
    stopRef.current = streamCodeforces(text, language, diffLabel, {
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

  const loadSample = (sample: typeof SAMPLE_PROBLEMS[0]) => {
    setProblemText(sample.text);
    setDifficulty(sample.diff);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Codeforces Solver</h2>
              <p className="text-xs text-muted">
                Solves any problem with a <span className="text-amber-400">unique</span>, correct approach — even 3000-rating legends
              </p>
            </div>
          </div>

          {/* Difficulty selector */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted mb-2 block uppercase tracking-wider">Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    difficulty === d.id
                      ? d.color
                      : 'border-white/10 text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {d.icon}
                  {d.label}
                  <span className="text-[10px] opacity-70">({d.id})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language selector */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted mb-2 block uppercase tracking-wider">
              <FileCode className="w-3 h-3 inline mr-1" />
              Language
            </label>
            <div className="flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    language === l.id
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : 'border-white/10 text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Problem input */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted mb-2 block uppercase tracking-wider">Problem Statement</label>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Paste the full Codeforces problem statement here — including constraints, input/output format, and examples..."
              rows={6}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] text-white text-sm placeholder:text-muted/60 px-4 py-3 outline-none focus:border-amber-500/40 transition-colors resize-y scrollbar-thin"
            />
          </div>

          {/* Sample problems */}
          {!output && !loading && (
            <div className="mb-4">
              <p className="text-xs text-muted mb-2">Try a sample problem:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_PROBLEMS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => loadSample(s)}
                    className="text-left rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 px-3 py-2.5 transition-all duration-150"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-softText">{s.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${
                        DIFFICULTIES.find((d) => d.id === s.diff)?.color
                      }`}>
                        {DIFFICULTIES.find((d) => d.id === s.diff)?.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !output && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-sm text-muted">
                Crafting a unique solution for this {activeDiff.label.toLowerCase()} problem...
              </p>
              <p className="text-xs text-muted/60 mt-1">
                Thinking through the algorithm, edge cases, and a non-standard approach
              </p>
            </div>
          )}

          {/* Output */}
          {output && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden animate-fade-in-up">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400"><Code2 className="w-4 h-4" /></span>
                  <span className="text-sm font-medium text-white">Solution</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${activeDiff.color}`}>
                    {activeDiff.label}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="px-4 py-4">
                <MarkdownRenderer content={output} />
                {loading && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-amber-400 align-middle animate-blink" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-3 sm:px-6 pb-4 sm:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 rounded-[26px] border border-inputBorder bg-inputBg px-3 py-2 shadow-lg shadow-black/20 focus-within:border-amber-500/30 transition-colors">
            <div className="flex items-center gap-1.5 pl-1 text-amber-400 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <input
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSolve()}
              placeholder="Paste a Codeforces problem or type a short one..."
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
                onClick={handleSolve}
                disabled={!problemText.trim()}
                className="flex items-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shrink-0 active:scale-95 px-4 py-2.5 text-sm font-medium"
                aria-label="Solve problem"
              >
                <Send className="w-4 h-4" />
                Solve
              </button>
            )}
          </div>
          <p className="text-center text-xs text-muted/70 mt-2.5">
            Every solution is unique — different from the editorial, but always correct.
          </p>
        </div>
      </div>
    </div>
  );
}
