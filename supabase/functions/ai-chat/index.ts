const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_KEY = "AIzaSyDrJywJ1VlGsuQiPCFOALTSRAKnhTBWCVA";
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";

const OPENROUTER_MODELS: Record<string, string> = {
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "perplexity": "perplexity/llama-3.1-sonar-large-128k-online",
};

interface MessageContext {
  role: "user" | "assistant";
  content: string;
}

function isGeminiModel(model: string): boolean {
  return model === "gemini-3.6-flash" || model === "auto";
}

function getReferer(): string {
  return "https://hltrmbjsyanfmamgxrxr.supabase.co";
}

// ---- Gemini streaming ----
async function geminiStream(
  history: MessageContext[],
  imageDataUrl: string | undefined,
  persona: string,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal
): Promise<Response> {
  const contents = history.map((m) => {
    const parts: Array<Record<string, unknown>> = [{ text: m.content }];
    if (m.role === "user" && imageDataUrl) {
      const base64 = imageDataUrl.split(",")[1] ?? "";
      const mime = imageDataUrl.match(/data:(.*?);/)?.[1] ?? "image/png";
      parts.unshift({ inline_data: { mime_type: mime, data: base64 } });
    }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, topP: 0.95, maxOutputTokens: maxTokens },
  };
  if (persona) {
    requestBody.systemInstruction = { parts: [{ text: persona }] };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(requestBody),
  });

  if (!res.ok || !res.body) {
    return new Response(
      JSON.stringify({ error: `Gemini returned ${res.status}` }),
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

// ---- OpenRouter streaming ----
async function openrouterStream(
  model: string,
  history: MessageContext[],
  imageDataUrl: string | undefined,
  persona: string,
  maxTokens: number,
  signal: AbortSignal
): Promise<Response> {
  const routeModel = OPENROUTER_MODELS[model];
  if (!routeModel) {
    return new Response(
      JSON.stringify({ error: `Unknown model: ${model}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const messages: Array<Record<string, unknown>> = history.map((m) => {
    if (m.role === "user" && imageDataUrl) {
      return {
        role: "user",
        content: [
          { type: "text", text: m.content },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      };
    }
    return { role: m.role === "assistant" ? "assistant" : "user", content: m.content };
  });
  if (persona) {
    messages.unshift({ role: "system", content: persona });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": getReferer(),
      "X-Title": "Danosu AI",
    },
    signal,
    body: JSON.stringify({ model: routeModel, messages, stream: true, max_tokens: maxTokens }),
  });

  if (!res.ok || !res.body) {
    return new Response(
      JSON.stringify({ error: `OpenRouter returned ${res.status}` }),
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
    const model: string = body.model ?? "auto";
    const history: MessageContext[] = body.history ?? [];
    const imageDataUrl: string | undefined = body.imageDataUrl;
    const persona: string = body.persona ?? "";
    const stream: boolean = body.stream ?? true;
    const maxTokens: number = body.maxTokens ?? 2048;
    const temperature: number = body.temperature ?? 0.8;

    const signal = new AbortController().signal;

    if (stream) {
      if (isGeminiModel(model)) {
        return await geminiStream(history, imageDataUrl, persona, maxTokens, temperature, signal);
      }
      return await openrouterStream(model, history, imageDataUrl, persona, maxTokens, signal);
    }

    // Non-stream: use stream internally, collect text, return JSON
    if (isGeminiModel(model)) {
      const res = await geminiStream(history, imageDataUrl, persona, maxTokens, temperature, signal);
      if (!res.ok || !res.body) {
        return new Response(
          JSON.stringify({ error: "Gemini stream failed" }),
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
            const text =
              event.candidates?.[0]?.content?.parts
                ?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
            if (text) acc += text;
          } catch { /* skip */ }
        }
      }
      return new Response(
        JSON.stringify({ text: acc }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // OpenRouter non-stream
    const routeModel = OPENROUTER_MODELS[model];
    if (!routeModel) {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${model}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messages: Array<Record<string, unknown>> = history.map((m) => {
      if (m.role === "user" && imageDataUrl) {
        return {
          role: "user",
          content: [
            { type: "text", text: m.content },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        };
      }
      return { role: m.role === "assistant" ? "assistant" : "user", content: m.content };
    });
    if (persona) {
      messages.unshift({ role: "system", content: persona });
    }

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": getReferer(),
        "X-Title": "Danosu AI",
      },
      body: JSON.stringify({ model: routeModel, messages, max_tokens: maxTokens }),
    });

    if (!orRes.ok) {
      return new Response(
        JSON.stringify({ error: `OpenRouter returned ${orRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await orRes.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
