const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

interface MessageContext {
  role: "user" | "assistant" | "system";
  content: string;
}

function getReferer(): string {
  return "https://hltrmbjsyanfmamgxrxr.supabase.co";
}

function buildMessages(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  persona: string
): Array<Record<string, unknown>> {
  const messages: Array<Record<string, unknown>> = [];
  if (persona) {
    messages.push({ role: "system", content: persona });
  }
  for (const m of history) {
    if (m.role === "user" && imageDataUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: m.content },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      });
    } else {
      messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
    }
  }
  return messages;
}

async function pollinationsStream(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  persona: string,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal
): Promise<Response> {
  const messages = buildMessages(history, imageDataUrl, persona);

  const res = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model: "openai",
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok || !res.body) {
    return new Response(
      JSON.stringify({ error: `Pollinations returned ${res.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const history: MessageContext[] = body.history ?? [];
    const imageDataUrl: string | undefined = body.imageDataUrl;
    const persona: string = body.persona ?? "";
    const stream: boolean = body.stream ?? true;
    const maxTokens: number = body.maxTokens ?? 2048;
    const temperature: number = body.temperature ?? 0.8;

    const signal = new AbortController().signal;

    if (stream) {
      return await pollinationsStream(history, imageDataUrl, persona, maxTokens, temperature, signal);
    }

    // Non-stream: use stream internally, collect text, return JSON
    const res = await pollinationsStream(history, imageDataUrl, persona, maxTokens, temperature, signal);
    if (!res.ok || !res.body) {
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          const delta = event.choices?.[0]?.delta?.content ?? "";
          if (delta) acc += delta;
        } catch { /* skip */ }
      }
    }
    return new Response(
      JSON.stringify({ text: acc }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
