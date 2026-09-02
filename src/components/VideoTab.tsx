import { useState } from 'react';
import { Video, Loader2, Download, Sparkles, Film } from 'lucide-react';
import { generateVideo } from '@/lib/videoGen';

const SAMPLE_PROMPTS = [
  'A drone flying over a misty forest at dawn',
  'Waves crashing on a rocky shore in slow motion',
  'Time-lapse of a city skyline from day to night',
  'A flower blooming in a sunlit garden',
];

export function VideoTab() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultPrompt, setResultPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);
    try {
      const result = await generateVideo(text);
      setResultUrl(result.url);
      setResultPrompt(text);
      setPrompt('');
    } catch {
      setError('Video generation is currently unavailable. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `danosu-video-${Date.now()}.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Video Generation</h2>
              <p className="text-xs text-muted">Turn text prompts into cinematic visuals</p>
            </div>
          </div>

          {/* Empty state */}
          {!resultUrl && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Film className="w-8 h-8 text-muted" />
              </div>
              <p className="text-sm text-muted mb-6">No videos yet. Describe a scene to generate.</p>
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
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
              <p className="text-sm text-muted">Generating your cinematic visual…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Result */}
          {resultUrl && !loading && (
            <div className="rounded-xl border border-white/10 overflow-hidden bg-black animate-fade-in-up">
              <div className="relative">
                <img
                  src={resultUrl}
                  alt={resultPrompt}
                  className="w-full max-h-[400px] object-contain"
                />
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                  <span className="text-[10px] text-white/80 font-medium">Cinematic Frame</span>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-softText truncate">{resultPrompt}</p>
                  <span className="text-[10px] text-muted">Pollinations Cinema</span>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors shrink-0 ml-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
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
              placeholder="Describe the video scene you want…"
              className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-muted/80 py-2"
              disabled={loading}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="p-2.5 rounded-full bg-accent hover:bg-accentDim text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shrink-0 active:scale-95"
              aria-label="Generate video"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
