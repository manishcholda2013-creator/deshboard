import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_KEY = Deno.env.get("VITE_GEMINI_API_KEY") ?? "";
const OPENROUTER_KEY = "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";

const PROFESSION_LABELS: Record<string, string> = {
  student: "Student",
  "job-seeker": "Job Seeker",
  "small-business": "Small Business Owner",
  "crypto-trader": "Crypto/Stock Trader",
};

interface Subscriber {
  id: string;
  full_name: string;
  profession: string;
  subscription_active: boolean;
}

async function generateCapsule(name: string, professionLabel: string): Promise<string> {
  const prompt = `Generate a daily 3-bullet personalized morning update for ${name} who is a ${professionLabel} in simple Hinglish. Keep it motivational, actionable, and concise. Format as exactly 3 bullet points.`;

  // Try Gemini first (free tier)
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
        }),
      }
    );
    if (geminiRes.ok) {
      const data = await geminiRes.json();
      const text = data.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (text) return text;
    }
  } catch {
    // fall through to OpenRouter
  }

  // Fallback: OpenRouter free models
  try {
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://danosu.ai",
        "X-Title": "Danosu WhatsApp Assistant",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
      }),
    });
    if (orRes.ok) {
      const data = await orRes.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      if (text) return text;
    }
  } catch {
    // fall through to fallback
  }

  return `Good morning ${name}! Yahan aapka daily update hai:\n- Aaj ka goal set karo aur uspe focus karo\n- Apne ${professionLabel} ke latest trends check karo\n- 10 minute self-improvement ke liye do — padhai, practice, ya planning`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all active subscribers
    const { data: subscribers, error: fetchError } = await supabase
      .from("whatsapp_subscribers")
      .select("id, full_name, profession, subscription_active")
      .eq("subscription_active", true);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscribers found", generated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ name: string; profession: string; success: boolean; preview: string }> = [];

    for (const sub of subscribers as Subscriber[]) {
      const professionLabel = PROFESSION_LABELS[sub.profession] ?? sub.profession;
      const capsule = await generateCapsule(sub.full_name, professionLabel);

      await supabase
        .from("whatsapp_subscribers")
        .update({
          last_capsule: capsule,
          last_capsule_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      results.push({
        name: sub.full_name,
        profession: professionLabel,
        success: true,
        preview: capsule.slice(0, 120),
      });
    }

    return new Response(
      JSON.stringify({
        message: "Daily capsule generation complete",
        generated: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
