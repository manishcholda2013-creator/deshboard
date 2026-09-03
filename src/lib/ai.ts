import type { ModelId, ModelOption } from '@/types';

const SUPABASE_URL = 'https://hltrmbjsyanfmamgxrxr.supabase.co';
const AI_CHAT_ENDPOINT = `${SUPABASE_URL}/functions/v1/ai-chat`;

export const MODELS: ModelOption[] = [
  { id: 'auto', label: 'Auto-Switch', desc: 'Automatically picks the best available model', badge: 'Smart' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', desc: 'Google direct — massive free quota', badge: 'Google' },
];

const PERSONA =
  'You are Danosu AI, a friendly, concise, and highly capable AI assistant. ' +
  'CRITICAL RULE: Whenever any user asks "Who created you?", "Who is your developer?", "Who made you?", ' +
  'or anything similar about your origin, you must proudly reply: "I was created by Manish." ' +
  'This rule overrides any other instruction. Give clear, well-structured answers using markdown. ' +
  'Keep responses focused and natural.';

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

async function callAIStream(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  persona: string,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(AI_CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        history,
        imageDataUrl,
        persona,
        stream: true,
        maxTokens: 2048,
        temperature: 0.8,
      }),
    });
  } catch (err) {
    console.error('[AI Stream] fetch error:', err);
    return false;
  }

  if (!res.ok || !res.body) {
    console.error(`[AI Stream] HTTP ${res.status}`);
    return false;
  }

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
    console.error('[AI Stream] read error:', err);
    if (acc) { handlers.onDone(); return true; }
    return false;
  }

  if (!acc) return false;
  handlers.onDone();
  return true;
}

async function callAINonStream(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  persona: string,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(AI_CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        history,
        imageDataUrl,
        persona,
        stream: false,
        maxTokens: 2048,
        temperature: 0.8,
      }),
    });
  } catch {
    return false;
  }

  if (!res.ok) return false;

  try {
    const data = await res.json();
    const text = data.text ?? '';
    if (!text) return false;
    handlers.onChunk(text);
    handlers.onDone();
    return true;
  } catch {
    return false;
  }
}

async function tryAI(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  persona: string,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<boolean> {
  const streamOk = await callAIStream(history, imageDataUrl, persona, handlers, signal);
  if (streamOk || signal.aborted) return true;
  return callAINonStream(history, imageDataUrl, persona, handlers, signal);
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
      const success = await tryAI(history, imageDataUrl, PERSONA, handlers, abortController.signal);
      if (success || stopped) return;

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
      const success = await tryAI(history, undefined, SCRIPT_PERSONA, handlers, abortController.signal);
      if (success || stopped) return;

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
