import { useState } from 'react';
import { Sparkles, Download, Loader2, ImageIcon, X } from 'lucide-react';
import { generateImage, IMAGE_MODELS } from '@/lib/imageGen';
import type { GeneratedImage } from '@/types';

const SAMPLE_PROMPTS = [
  'A serene mountain lake at golden hour',
  'Cyberpunk city street with neon reflections',
  'A cute robot drinking coffee in a cafe',
  'Abstract flowing waves of emerald and gold',
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function ImageTab() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('flux');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [lightbox, setLightbox] = useState<GeneratedImage | null>(null);

  const handleGenerate = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateImage(text, model);
      const img: GeneratedImage = {
        id: uid(),
        url: result.url,
        prompt: text,
        model: result.model,
        createdAt: Date.now(),
      };
      setImages((prev) => [img, ...prev]);
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const a = document.createElement('a');
    a.href = img.url;
    a.download = `danosu-${img.id}.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Image Generation</h2>
              <p className="text-xs text-muted">Create stunning visuals from text</p>
            </div>
          </div>

          {/* Empty state */}
          {images.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-muted" />
              </div>
              <p className="text-sm text-muted mb-6">No images yet. Try a prompt below.</p>
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
              <p className="text-sm text-muted">Generating your image…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Gallery */}
          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] animate-fade-in-up"
                >
                  <div className="relative cursor-pointer" onClick={() => setLightbox(img)}>
                    <img
                      src={img.url}
                      alt={img.prompt}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-softText line-clamp-2 mb-2">{img.prompt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted">{img.model}</span>
                      <button
                        onClick={() => handleDownload(img)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-3 sm:px-6 pb-4 sm:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            {IMAGE_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all duration-150 ${
                  model === m.id
                    ? 'border-accent/60 bg-accent/10 text-accent'
                    : 'border-white/10 text-muted hover:text-softText hover:border-white/20'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-[26px] border border-inputBorder bg-inputBg px-3 py-2 shadow-lg shadow-black/20 focus-within:border-white/25 transition-colors">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Describe the image you want to create…"
              className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-muted/80 py-2"
              disabled={loading}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="p-2.5 rounded-full bg-accent hover:bg-accentDim text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shrink-0 active:scale-95"
              aria-label="Generate image"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full">
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 p-2 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightbox.url} alt={lightbox.prompt} className="w-full rounded-xl" />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-softText">{lightbox.prompt}</p>
              <button
                onClick={() => handleDownload(lightbox)}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
