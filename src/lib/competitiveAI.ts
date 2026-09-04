/**
 * AI API switching loop — competitive programming mode.
 *
 * Rotates through multiple AI endpoints on each call (or on failure) to
 * maximize throughput and resilience. System instructions are tuned for
 * solving hard competitive programming problems (Codeforces 3000+ rating
 * level): optimal algorithms, tight time/space complexity, edge-case
 * awareness, and clean implementation.
 */

export interface AIEndpoint {
  id: string;
  label: string;
  url: string;
  model: string;
  apiKey: string;
}

export const COMPETITIVE_SYSTEM_INSTRUCTION =
  'You are CodeFlex Competitive AI, an elite competitive programming solver ' +
  'operating at Codeforces 3000+ rating level. When given a problem:\n' +
  '1. Analyze constraints and identify the optimal algorithmic approach.\n' +
  '2. Reason about time and space complexity to ensure it fits within limits.\n' +
  '3. Consider all edge cases (boundary, overflow, empty input, maximum constraints).\n' +
  '4. Provide a clean, correct, and efficient implementation in C++ by default ' +
  '(unless another language is requested).\n' +
  '5. Include a brief complexity analysis and key insight summary.\n' +
  'Prefer O(n log n) or better. Avoid brute force unless constraints allow it. ' +
  'Use fast I/O. Handle integer overflow with long long where needed. ' +
  'Be precise — a single off-by-one or overflow is a Wrong Answer verdict.';

export const AI_ENDPOINTS: AIEndpoint[] = [
  {
    id: 'primary',
    label: 'Primary Engine',
    url: '/api/ai-chat',
    model: 'codeflex-ultra',
    apiKey: '',
  },
  {
    id: 'fallback-1',
    label: 'Fallback Engine A',
    url: '/api/ai-chat',
    model: 'codeflex-pro',
    apiKey: '',
  },
  {
    id: 'fallback-2',
    label: 'Fallback Engine B',
    url: '/api/ai-chat',
    model: 'codeflex-flash',
    apiKey: '',
  },
];

let currentIndex = 0;

export function getNextEndpoint(): AIEndpoint {
  const endpoint = AI_ENDPOINTS[currentIndex];
  currentIndex = (currentIndex + 1) % AI_ENDPOINTS.length;
  return endpoint;
}

export function getCurrentEndpoint(): AIEndpoint {
  return AI_ENDPOINTS[currentIndex];
}

export async function solveCompetitiveProblem(
  problem: string,
  language: string = 'C++'
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < AI_ENDPOINTS.length; attempt++) {
    const endpoint = getNextEndpoint();
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Model': endpoint.model,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: COMPETITIVE_SYSTEM_INSTRUCTION },
            {
              role: 'user',
              content: `Solve this competitive programming problem in ${language}:\n\n${problem}`,
            },
          ],
          model: endpoint.model,
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? data.content ?? '';
      if (!content) throw new Error('Empty response');

      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('All AI endpoints failed');
}
