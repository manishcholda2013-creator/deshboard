import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  MessageCircle,
  Sparkles,
  Check,
  Loader2,
  QrCode,
  X,
  Terminal,
  User,
  Phone,
  Briefcase,
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PROFESSIONS = [
  { value: 'student', label: 'Student' },
  { value: 'job-seeker', label: 'Job Seeker' },
  { value: 'small-business', label: 'Small Business' },
  { value: 'crypto-trader', label: 'Crypto/Stock Trader' },
];

interface LogEntry {
  text: string;
  type: 'info' | 'success' | 'error';
  time: string;
}

export function WhatsAppPremium() {
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [profession, setProfession] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [capsulePreview, setCapsulePreview] = useState<string | null>(null);

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setLogs((prev) => [...prev, { text, type, time }]);
  };

  const handleSubscribeClick = () => {
    if (!fullName.trim() || !whatsappNumber.trim() || !profession) return;
    setShowQR(true);
  };

  const handlePaymentConfirm = async () => {
    setPaymentDone(true);
    setSubscribing(true);

    try {
      const { data, error } = await supabase
        .from('whatsapp_subscribers')
        .insert({
          full_name: fullName.trim(),
          whatsapp_number: whatsappNumber.trim(),
          profession,
          payment_status: 'paid',
          subscription_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      addLog(`[Register] New subscriber saved: ${fullName.trim()} (${profession})`, 'success');
      addLog(`[Cron] Mock background job scheduled for daily 8:00 AM IST`, 'info');
      addLog(`[Cron] Next run: tomorrow at 08:00 — will call free Gemini API`, 'info');

      setSubscribed(true);
      setSubscribing(false);

      // Auto-trigger first capsule generation
      setTimeout(() => {
        generateFirstCapsule(data.id, fullName.trim(), profession);
      }, 800);
    } catch {
      addLog(`[Error] Failed to save subscription. Please try again.`, 'error');
      setSubscribing(false);
    }
  };

  const generateFirstCapsule = async (subId: string, name: string, prof: string) => {
    setGenerating(true);
    addLog(`[Cron] Triggering immediate capsule generation for ${name}…`, 'info');

    try {
      const profLabel = PROFESSIONS.find((p) => p.value === prof)?.label ?? prof;
      const prompt = `Generate a daily 3-bullet personalized morning update for ${name} who is a ${profLabel} in simple Hinglish. Keep it motivational, actionable, and concise. Format as exactly 3 bullet points.`;

      addLog(`[API] Calling Gemini free tier for ${name} (${profLabel})…`, 'info');

      // Try Gemini free API directly from browser
      const geminiKey = 'AIzaSyDrJywJ1VlGsuQiPCFOALTSRAKnhTBWCVA';
      let capsuleText = '';

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          capsuleText =
            data.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
        }
      } catch {
        // fall through to edge function
      }

      if (!capsuleText) {
        addLog(`[API] Gemini direct failed, calling edge function fallback…`, 'info');
        // Call the edge function as fallback
        const fnUrl = `${supabaseUrl}/functions/v1/daily-capsule`;
        const fnRes = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        if (fnRes.ok) {
          const fnData = await fnRes.json();
          const match = fnData.results?.find(
            (r: { name: string }) => r.name.toLowerCase() === name.toLowerCase()
          );
          capsuleText = match?.preview ?? '';
        }
      }

      if (capsuleText) {
        setCapsulePreview(capsuleText);
        addLog(
          `[Success] Generated daily WhatsApp capsule for ${name} using free API tier. Message ready to send.`,
          'success'
        );

        // Save capsule to database
        await supabase
          .from('whatsapp_subscribers')
          .update({
            last_capsule: capsuleText,
            last_capsule_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subId);
      } else {
        addLog(`[Warning] API returned empty. Using fallback template.`, 'error');
        setCapsulePreview(
          `Good morning ${name}! Yahan aapka daily update hai:\n- Aaj ka goal set karo aur uspe focus karo\n- Apne ${PROFESSIONS.find((p) => p.value === prof)?.label} ke latest trends check karo\n- 10 minute self-improvement ke liye do`
        );
        addLog(
          `[Success] Generated daily WhatsApp capsule for ${name} using fallback template. Message ready to send.`,
          'success'
        );
      }
    } catch {
      addLog(`[Error] Capsule generation failed. Check console.`, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setFullName('');
    setWhatsappNumber('');
    setProfession('');
    setShowQR(false);
    setPaymentDone(false);
    setSubscribed(false);
    setLogs([]);
    setCapsulePreview(null);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-teal-500/[0.03] p-5 sm:p-6 mb-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            AI WhatsApp Premium Assistant
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </h2>
          <p className="text-xs text-muted">
            Daily personalized Hinglish morning updates delivered to your WhatsApp — ₹99/month
          </p>
        </div>
      </div>

      {!subscribed ? (
        <>
          {/* Form */}
          <div className="space-y-3 mb-5">
            {/* Full Name */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                <User className="w-3.5 h-3.5" />
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-white/10 bg-inputBg px-4 py-2.5 text-sm text-white placeholder:text-muted/60 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                <Phone className="w-3.5 h-3.5" />
                WhatsApp Number (with country code)
              </label>
              <input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-white/10 bg-inputBg px-4 py-2.5 text-sm text-white placeholder:text-muted/60 outline-none focus:border-emerald-500/40 transition-colors"
              />
            </div>

            {/* Profession */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Category / Profession
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setProfession(p.value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 ${
                      profession === p.value
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-white/[0.03] text-softText hover:border-white/20 hover:bg-white/[0.07]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribeClick}
            disabled={!fullName.trim() || !whatsappNumber.trim() || !profession}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            Subscribe Now @ ₹99/month
          </button>
        </>
      ) : (
        /* Subscribed state */
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Subscription Active!</p>
              <p className="text-xs text-muted">
                Daily capsules will be generated every morning at 8:00 AM IST
              </p>
            </div>
          </div>

          {/* Capsule Preview */}
          {capsulePreview && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-white/[0.02]">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Today's WhatsApp Capsule</span>
              </div>
              <div className="px-4 py-3">
                <pre className="text-sm text-softText whitespace-pre-wrap font-sans leading-relaxed">
                  {capsulePreview}
                </pre>
              </div>
            </div>
          )}

          {/* Simulation Log */}
          <div className="rounded-xl border border-white/10 bg-[#0d0d0d] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-white/[0.03]">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">Cron Simulation Log</span>
            </div>
            <div className="px-4 py-3 max-h-[200px] overflow-y-auto scrollbar-thin space-y-1.5">
              {logs.length === 0 ? (
                <p className="text-xs text-muted/60 italic">Waiting for logs…</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-mono animate-fade-in">
                    <span className="text-muted/50 shrink-0">{log.time}</span>
                    <span
                      className={
                        log.type === 'success'
                          ? 'text-emerald-400'
                          : log.type === 'error'
                          ? 'text-red-400'
                          : 'text-softText'
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
              {generating && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Generating…</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleReset}
            className="text-xs text-muted hover:text-white transition-colors underline underline-offset-2"
          >
            Subscribe another number
          </button>
        </div>
      )}

      {/* QR Payment Modal */}
      {showQR && !paymentDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
          <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 max-w-sm w-full p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-base">Scan to Pay ₹99</h3>
              <button
                onClick={() => setShowQR(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mock QR Code */}
            <div className="flex flex-col items-center py-4">
              <div className="relative w-48 h-48 rounded-xl bg-white p-3 mb-4">
                <QrCode className="w-full h-full text-black" strokeWidth={1.5} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-white font-medium mb-1">₹99 / month</p>
              <p className="text-xs text-muted text-center">
                Scan this QR with any UPI app (GPay, PhonePe, Paytm)
              </p>
            </div>

            <button
              onClick={handlePaymentConfirm}
              disabled={subscribing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            >
              {subscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activating subscription…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  I've Paid — Activate Subscription
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Payment Success Toast */}
      {paymentDone && subscribed && (
        <div className="fixed bottom-6 right-4 z-[80] animate-fade-in-up">
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-[#1e1e1e] px-4 py-3 shadow-2xl max-w-sm">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm text-white">Payment successful! Subscription activated.</p>
          </div>
        </div>
      )}
    </div>
  );
}
