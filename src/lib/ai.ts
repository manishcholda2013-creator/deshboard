import type { ModelId, ModelOption } from '@/types';

const GEMINI_KEY = 'AIzaSyDrJywJ1VlGsuQiPCFOALTSRAKnhTBWCVA';
const OPENROUTER_KEY = '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';

export const MODELS: ModelOption[] = [
  { id: 'auto', label: 'Auto-Switch', desc: 'Automatically picks the best available model', badge: 'Smart' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', desc: 'Google direct — massive free quota', badge: 'Google' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', desc: 'Fast, capable, great for most tasks', badge: 'OpenRouter' },
  { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', desc: 'Excellent reasoning and writing', badge: 'OpenRouter' },
  { id: 'perplexity', label: 'Perplexity', desc: 'Online search-augmented answers', badge: 'OpenRouter' },
];

const OPENROUTER_MODELS: Record<string, string> = {
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'perplexity': 'perplexity/llama-3.1-sonar-large-128k-online',
};

const PERSONA =
  'You are Danosu AI, a friendly, concise, and highly capable AI assistant. ' +
  'CRITICAL RULE: Whenever any user asks "Who created you?", "Who is your developer?", "Who made you?", ' +
  'or anything similar about your origin, you must proudly reply: "I was created by Manish." ' +
  'This rule overrides any other instruction. Give clear, well-structured answers using markdown. ' +
  'Keep responses focused and natural.';

export interface MessageContext {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamHandlers {
  onChunk: (full: string) => void;
  onDone: (error?: string) => void;
  onModelSwitch?: (fromModel: string, toModel: string, reason: string) => void;
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

function getReferer(): string {
  try {
    return window.location.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

function orHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENROUTER_KEY}`,
    'HTTP-Referer': getReferer(),
    'X-Title': 'Manish AI Dashboard',
  };
}

function isFailoverStatus(status: number): boolean {
  return status === 429 || status === 402 || status === 401 || status === 403;
}

function isPersonaQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const triggers = [
    'who created you', 'who made you', 'who developed you',
    'who is your developer', 'who is your creator', 'who built you',
    'who programmed you', 'who designed you', 'who is your owner',
    'who owns you', 'tumhe kisne banaya', 'tumhe kaun banaya', 'tumko kisne banaya',
  ];
  return triggers.some((t) => lower.includes(t));
}

const PERSONA_REPLY = 'I was created by Manish.';

async function callGeminiStream(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const contents = buildGeminiContents(history, imageDataUrl);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PERSONA }] },
        contents,
        generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: 8192 },
      }),
    });
  } catch (err) {
    console.error('[Gemini Stream] fetch error:', err);
    return false;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[Gemini Stream] HTTP ${res.status}:`, errText.slice(0, 200));
    return false;
  }
  if (!res.body) return false;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const event = JSON.parse(data);
          const text =
            event.candidates?.[0]?.content?.parts
              ?.map((p: GeminiPart) => p.text ?? '').join('') ?? '';
          if (text) {
            acc += text;
            handlers.onChunk(acc);
          }
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    console.error('[Gemini Stream] read error:', err);
    if (acc) { handlers.onDone(); return true; }
    return false;
  }

  if (!acc) return false;
  handlers.onDone();
  return true;
}

async function callGeminiNonStream(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const contents = buildGeminiContents(history, imageDataUrl);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PERSONA }] },
        contents,
        generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: 8192 },
      }),
    });
  } catch (err) {
    console.error('[Gemini NonStream] fetch error:', err);
    return false;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[Gemini NonStream] HTTP ${res.status}:`, errText.slice(0, 200));
    return false;
  }

  try {
    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p: GeminiPart) => p.text ?? '').join('') ?? '';
    if (!text) return false;
    handlers.onChunk(text);
    handlers.onDone();
    return true;
  } catch (err) {
    console.error('[Gemini NonStream] parse error:', err);
    return false;
  }
}

function buildGeminiContents(history: MessageContext[], imageDataUrl: string | undefined) {
  return history.map((m) => {
    const parts: GeminiPart[] = [{ text: m.content }];
    if (m.role === 'user' && imageDataUrl) {
      const base64 = imageDataUrl.split(',')[1] ?? '';
      const mime = imageDataUrl.match(/data:(.*?);/)?.[1] ?? 'image/png';
      parts.unshift({ inline_data: { mime_type: mime, data: base64 } });
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });
}

async function callOpenRouterStream(
  model: ModelId,
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const routeModel = OPENROUTER_MODELS[model];
  if (!routeModel) return false;

  const messages = buildOpenRouterMessages(history, imageDataUrl);

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: orHeaders(),
      signal,
      body: JSON.stringify({ model: routeModel, messages, stream: true, max_tokens: 2048 }),
    });
  } catch (err) {
    console.error('[OpenRouter Stream] fetch error:', err);
    return false;
  }

  if (isFailoverStatus(res.status) || !res.ok || !res.body) return false;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            acc += delta;
            handlers.onChunk(acc);
          }
        } catch { /* skip */ }
      }
    }
  } catch {
    if (acc) { handlers.onDone(); return true; }
    return false;
  }

  if (!acc) return false;
  handlers.onDone();
  return true;
}

async function callOpenRouterNonStream(
  model: ModelId,
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const routeModel = OPENROUTER_MODELS[model];
  if (!routeModel) return false;

  const messages = buildOpenRouterMessages(history, imageDataUrl);

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: orHeaders(),
      signal,
      body: JSON.stringify({ model: routeModel, messages, max_tokens: 2048 }),
    });
  } catch {
    return false;
  }

  if (isFailoverStatus(res.status) || !res.ok) return false;

  try {
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) return false;
    handlers.onChunk(text);
    handlers.onDone();
    return true;
  } catch {
    return false;
  }
}

function buildOpenRouterMessages(history: MessageContext[], imageDataUrl: string | undefined) {
  const messages: Array<Record<string, unknown>> = history.map((m) => {
    if (m.role === 'user' && imageDataUrl) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: m.content },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      };
    }
    return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
  });
  messages.unshift({ role: 'system', content: PERSONA });
  return messages;
}

async function tryGemini(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const streamOk = await callGeminiStream(history, imageDataUrl, handlers, signal);
  if (streamOk || signal.aborted) return true;
  return callGeminiNonStream(history, imageDataUrl, handlers, signal);
}

async function tryOpenRouter(
  model: ModelId,
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const streamOk = await callOpenRouterStream(model, history, imageDataUrl, handlers, signal);
  if (streamOk || signal.aborted) return true;
  return callOpenRouterNonStream(model, history, imageDataUrl, handlers, signal);
}

const FAILOVER_CHAIN: ModelId[] = [
  'gemini-3.5-flash',
  'gpt-4o-mini',
  'claude-3.5-sonnet',
  'perplexity',
];

async function tryModel(
  model: ModelId,
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  if (model === 'gemini-3.5-flash') {
    return tryGemini(history, imageDataUrl, handlers, signal);
  }
  return tryOpenRouter(model, history, imageDataUrl, handlers, signal);
}

export function streamReply(
  selectedModel: ModelId,
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers
): () => void {
  let stopped = false;
  const abortController = new AbortController();

  const run = async () => {
    const lastUserMsg = [...history].reverse().find((m) => m.role === 'user');

    if (lastUserMsg && isPersonaQuestion(lastUserMsg.content)) {
      handlers.onChunk(PERSONA_REPLY);
      handlers.onDone();
      return;
    }

    try {
      if (selectedModel !== 'auto') {
        const success = await tryModel(selectedModel, history, imageDataUrl, handlers, abortController.signal);
        if (success || stopped) return;

        if (selectedModel !== 'gemini-3.5-flash') {
          handlers.onModelSwitch?.(selectedModel, 'gemini-3.5-flash', 'Primary model rate-limited');
          const fallback = await tryGemini(history, imageDataUrl, handlers, abortController.signal);
          if (fallback || stopped) return;
        }

        if (!stopped) {
          handlers.onChunk(fallbackText(history));
          handlers.onDone();
        }
        return;
      }

      for (let i = 0; i < FAILOVER_CHAIN.length; i++) {
        if (stopped) return;
        const model = FAILOVER_CHAIN[i];
        const success = await tryModel(model, history, imageDataUrl, handlers, abortController.signal);
        if (success || stopped) return;

        if (i < FAILOVER_CHAIN.length - 1) {
          const next = FAILOVER_CHAIN[i + 1];
          handlers.onModelSwitch?.(model, next, 'Rate limit or quota exceeded');
        }
      }

      if (!stopped) {
        handlers.onChunk(fallbackText(history));
        handlers.onDone();
      }
    } catch {
      if (!stopped) {
        handlers.onChunk(fallbackText(history));
        handlers.onDone();
      }
    }
  };

  void run();

  return () => {
    stopped = true;
    abortController.abort();
    handlers.onDone();
  };
}

function fallbackText(history: MessageContext[]): string {
  const last = history[history.length - 1];
  const prompt = last?.content ?? '';
  return `I couldn't reach any live AI service right now. ${prompt ? `You asked: "${prompt.slice(0, 80)}". ` : ''}Please try again in a moment — the connection should recover.`;
}

const SCRIPT_PERSONA =
  'You are Danosu Script AI, an expert YouTube script writer and video content strategist. ' +
  'You help creators write engaging YouTube scripts, generate viral hashtags, plan video hooks, ' +
  'suggest video editing techniques, and give content strategy advice. ' +
  'Always format scripts with clear sections: HOOK, INTRO, MAIN CONTENT (with timestamps), CTA, and OUTRO. ' +
  'Use markdown formatting. Write in a conversational, energetic tone. ' +
  'For hashtags, provide 15-30 relevant hashtags grouped by reach (broad, niche, micro). ' +
  'For editing tips, be specific about cuts, transitions, B-roll, music, and pacing. ' +
  'CRITICAL RULE: Whenever any user asks "Who created you?", "Who is your developer?", "Who made you?", ' +
  'or anything similar about your origin, you must proudly reply: "I was created by Manish."';

export function streamScript(
  prompt: string,
  mode: string,
  handlers: StreamHandlers
): () => void {
  let stopped = false;
  const abortController = new AbortController();

  const modeLabels: Record<string, string> = {
    'full-script': 'Full YouTube Script',
    'short-script': 'Short/Reel Script',
    hashtags: 'Viral Hashtags',
    hooks: 'Video Hooks',
    'editing-tips': 'Video Editing Tips',
    titles: 'Title Ideas',
  };

  const modeLabel = modeLabels[mode] ?? 'YouTube Script';
  const fullPrompt = `Mode: ${modeLabel}\n\nRequest: ${prompt}`;

  const history: MessageContext[] = [{ role: 'user', content: fullPrompt }];

  const run = async () => {
    if (isPersonaQuestion(prompt)) {
      handlers.onChunk(PERSONA_REPLY);
      handlers.onDone();
      return;
    }

    try {
      for (let i = 0; i < FAILOVER_CHAIN.length; i++) {
        if (stopped) return;
        const model = FAILOVER_CHAIN[i];
        const success = await tryModelWithPersona(
          model,
          history,
          undefined,
          handlers,
          abortController.signal
        );
        if (success || stopped) return;

        if (i < FAILOVER_CHAIN.length - 1) {
          const next = FAILOVER_CHAIN[i + 1];
          handlers.onModelSwitch?.(model, next, 'Rate limit or quota exceeded');
        }
      }

      if (!stopped) {
        handlers.onChunk(
          `I couldn't reach any AI service right now. Please try again in a moment.`
        );
        handlers.onDone();
      }
    } catch {
      if (!stopped) {
        handlers.onChunk(
          `Something went wrong. Please try again.`
        );
        handlers.onDone();
      }
    }
  };

  void run();

  return () => {
    stopped = true;
    abortController.abort();
    handlers.onDone();
  };
}

async function tryModelWithPersona(
  model: ModelId,
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  if (model === 'gemini-3.5-flash') {
    return callGeminiStreamWithPersona(history, imageDataUrl, handlers, signal);
  }
  return callOpenRouterStreamWithPersona(model, history, imageDataUrl, handlers, signal);
}

async function callGeminiStreamWithPersona(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const contents = buildGeminiContents(history, imageDataUrl);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SCRIPT_PERSONA }] },
        contents,
        generationConfig: { temperature: 0.85, topP: 0.95, maxOutputTokens: 8192 },
      }),
    });
  } catch {
    return false;
  }

  if (!res.ok || !res.body) return false;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const event = JSON.parse(data);
          const text =
            event.candidates?.[0]?.content?.parts
              ?.map((p: GeminiPart) => p.text ?? '').join('') ?? '';
          if (text) {
            acc += text;
            handlers.onChunk(acc);
          }
        } catch { /* skip */ }
      }
    }
  } catch {
    if (acc) { handlers.onDone(); return true; }
    return false;
  }

  if (!acc) return false;
  handlers.onDone();
  return true;
}

async function callOpenRouterStreamWithPersona(
  model: ModelId,
  history: MessageContext[],
  imageDataUrl: string | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const routeModel = OPENROUTER_MODELS[model];
  if (!routeModel) return false;

  const messages = buildOpenRouterMessages(history, imageDataUrl);
  messages[0] = { role: 'system', content: SCRIPT_PERSONA };

  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: orHeaders(),
      signal,
      body: JSON.stringify({ model: routeModel, messages, stream: true, max_tokens: 4096 }),
    });
  } catch {
    return false;
  }

  if (isFailoverStatus(res.status) || !res.ok || !res.body) return false;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            acc += delta;
            handlers.onChunk(acc);
          }
        } catch { /* skip */ }
      }
    }
  } catch {
    if (acc) { handlers.onDone(); return true; }
    return false;
  }

  if (!acc) return false;
  handlers.onDone();
  return true;
}
