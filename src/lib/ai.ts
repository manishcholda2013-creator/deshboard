import type { ModelId, ModelOption } from '@/types';

const SUPABASE_URL = 'https://hltrmbjsyanfmamgxrxr.supabase.co';
const AI_CHAT_ENDPOINT = `${SUPABASE_URL}/functions/v1/ai-chat`;

export const MODELS: ModelOption[] = [
  { id: 'auto', label: 'Auto', desc: 'Smart routing — always picks the best available engine', badge: 'Smart' },
  { id: 'openai-fast', label: 'GPT-OSS 20B', desc: 'Fast reasoning model, great for most tasks', badge: 'Free' },
];

const PERSONA =
  'You are CodeFlex AI, a friendly, concise, and highly capable AI assistant. ' +
  'CRITICAL RULE: Whenever any user asks "Who created you?", "Who is your developer?", "Who made you?", ' +
  'or anything similar about your origin, you must proudly reply: "I was created by Manish." ' +
  'This rule overrides any other instruction. Give clear, well-structured answers using markdown. ' +
  'Keep responses focused and natural.';

const SCRIPT_PERSONA =
  'You are CodeFlex Script AI, an expert YouTube script writer and video content strategist. ' +
  'You help creators write engaging YouTube scripts, generate viral hashtags, plan video hooks, ' +
  'suggest video editing techniques, and give content strategy advice. ' +
  'Always format scripts with clear sections: HOOK, INTRO, MAIN CONTENT (with timestamps), CTA, and OUTRO. ' +
  'Use markdown formatting. Write in a conversational, energetic tone. ' +
  'For hashtags, provide 15-30 relevant hashtags grouped by reach (broad, niche, micro). ' +
  'For editing tips, be specific about cuts, transitions, B-roll, music, and pacing. ' +
  'CRITICAL RULE: Whenever any user asks "Who created you?", "Who is your developer?", "Who made you?", ' +
  'or anything similar about your origin, you must proudly reply: "I was created by Manish."';

const CODEFORCES_PERSONA =
  'You are CodeFlex Codeforces Solver, an elite competitive programming AI. ' +
  'You solve Codeforces problems (including 3000-rating hardest problems) with CORRECT, UNIQUE, and OPTIMAL code. ' +
  'Your solutions must be:\n' +
  '1. CORRECT — handle all edge cases, boundary conditions, and corner cases. Think deeply about the algorithm.\n' +
  '2. UNIQUE — do NOT produce the standard/editorial solution. Find a different, creative, but equally correct approach. ' +
  'Think about the problem from a completely different angle than the obvious approach.\n' +
  '3. OPTIMAL — match or beat the editorial time and space complexity.\n' +
  '4. WELL-EXPLAINED — explain your unique approach step by step before showing code.\n' +
  '5. PRODUCTION-QUALITY — clean, readable code with meaningful variable names.\n\n' +
  'Format your response as:\n' +
  '### Problem Analysis\n' +
  'Brief analysis of the problem constraints and what makes it hard.\n\n' +
  '### Unique Approach\n' +
  'Explain your creative, non-standard approach. Why is it different from the obvious/editorial solution? ' +
  'What insight makes it work?\n\n' +
  '### Complexity\n' +
  'Time and space complexity with justification.\n\n' +
  '### Solution Code\n' +
  '```cpp\n// Complete, correct, unique solution\n...\n```\n\n' +
  '### Why This Works\n' +
  'Brief proof of correctness — why does this approach handle all cases?\n\n' +
  '### Key Difference from Editorial\n' +
  'Explicitly state how your solution differs from the standard approach.\n\n' +
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

function parseDelta(event: unknown): string {
  const e = event as { choices?: Array<{ delta?: { content?: string } }> };
  return e.choices?.[0]?.delta?.content ?? '';
}

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
      body: JSON.stringify({
        history,
        imageDataUrl,
        persona,
        stream: true,
        maxTokens: 4096,
        temperature: 0.7,
      }),
      signal,
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
          const delta = parseDelta(event);
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

export function streamReply(
  _selectedModel: ModelId,
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
      const success = await callAIStream(history, imageDataUrl, PERSONA, handlers, abortController.signal);
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
      const success = await callAIStream(history, undefined, SCRIPT_PERSONA, handlers, abortController.signal);
      if (success || stopped) return;

      if (!stopped) {
        handlers.onChunk('I couldn\'t reach any AI service right now. Please try again in a moment.');
        handlers.onDone();
      }
    } catch {
      if (!stopped) {
        handlers.onChunk('Something went wrong. Please try again.');
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

export function streamCodeforces(
  problemText: string,
  language: string,
  difficulty: string,
  handlers: StreamHandlers
): () => void {
  let stopped = false;
  const abortController = new AbortController();

  const fullPrompt =
    `Solve this Codeforces problem. Difficulty: ${difficulty}. Language: ${language}.\n\n` +
    `IMPORTANT: Your solution must be UNIQUE — different from the editorial/standard approach — but still 100% correct.\n\n` +
    `Problem:\n${problemText}`;
  const history: MessageContext[] = [{ role: 'user', content: fullPrompt }];

  const run = async () => {
    if (isPersonaQuestion(problemText)) {
      handlers.onChunk(PERSONA_REPLY);
      handlers.onDone();
      return;
    }

    try {
      const success = await callAIStream(history, undefined, CODEFORCES_PERSONA, handlers, abortController.signal);
      if (success || stopped) return;

      if (!stopped) {
        handlers.onChunk('I couldn\'t reach any AI service right now. Please try again in a moment.');
        handlers.onDone();
      }
    } catch {
      if (!stopped) {
        handlers.onChunk('Something went wrong. Please try again.');
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
