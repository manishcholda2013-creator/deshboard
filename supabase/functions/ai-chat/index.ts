const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_KEY = "AIzaSyDrJywJ1VlGsuQiPCFOALTSRAKnhTBWCVA";

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface MessageContext {
  role: "user" | "assistant";
  content: string;
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

    const contents = history.map((m) => {
      const parts: GeminiPart[] = [{ text: m.content }];
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

    const model = "gemini-3.6-flash";
    const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;

    if (stream) {
      const endpoint = `${base}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
      const geminiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!geminiRes.ok || !geminiRes.body) {
        return new Response(
          JSON.stringify({ error: `Gemini returned ${geminiRes.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(geminiRes.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      const endpoint = `${base}:generateContent?key=${GEMINI_KEY}`;
      const geminiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!geminiRes.ok) {
        return new Response(
          JSON.stringify({ error: `Gemini returned ${geminiRes.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await geminiRes.json();
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p: GeminiPart) => p.text ?? "").join("") ?? "";

      return new Response(
        JSON.stringify({ text }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
