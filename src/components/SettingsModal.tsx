import { useState } from 'react';
import {
  X,
  User,
  Palette,
  Brain,
  ShieldCheck,
  Bell,
  ChevronRight,
  Check,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

type Tab = 'profile' | 'appearance' | 'model' | 'privacy' | 'notifications';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'model', label: 'AI Model', icon: <Brain className="w-4 h-4" /> },
  { id: 'privacy', label: 'Privacy', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
];

const MODELS = [
  { id: 'codeflex-ultra', label: 'CodeFlex Ultra', desc: 'Most capable, slower responses' },
  { id: 'codeflex-pro', label: 'CodeFlex Pro', desc: 'Balanced speed and intelligence' },
  { id: 'codeflex-flash', label: 'CodeFlex Flash', desc: 'Fastest, great for quick tasks' },
];

const THEMES = ['Dark', 'Light', 'System'];

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [selectedModel, setSelectedModel] = useState('codeflex-pro');
  const [selectedTheme, setSelectedTheme] = useState('Dark');
  const [userName, setUserName] = useState('CodeFlex User');
  const [instrValue, setInstrValue] = useState('');
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [trainingEnabled, setTrainingEnabled] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 w-full max-w-2xl shadow-2xl flex flex-col sm:flex-row overflow-hidden animate-fade-in-up max-h-[90vh]">
        {/* Sidebar nav */}
        <nav className="sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r border-white/8 bg-[#181818] p-3 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
          <div className="hidden sm:flex items-center gap-2 px-2 py-2 mb-2">
            <span className="text-sm font-semibold text-white">Settings</span>
          </div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all duration-150 ${
                activeTab === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-muted hover:bg-white/5 hover:text-softText'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h2 className="text-base font-semibold text-white">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/8 text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
            {activeTab === 'profile' && (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{userName}</p>
                    <p className="text-xs text-muted mt-0.5">Free plan — upgrade for more</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-softText mb-1.5">Display name</label>
                  <input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-accent/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-softText mb-1.5">Custom instructions</label>
                  <textarea
                    rows={4}
                    value={instrValue}
                    onChange={(e) => setInstrValue(e.target.value)}
                    placeholder="Tell CodeFlex AI how you'd like it to respond — your role, preferred style, what to avoid…"
                    className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none focus:border-accent/60 transition-colors resize-none scrollbar-thin"
                  />
                  <p className="text-xs text-muted mt-1">{instrValue.length}/1500</p>
                </div>
              </>
            )}

            {activeTab === 'appearance' && (
              <>
                <div>
                  <label className="block text-sm text-softText mb-3">Theme</label>
                  <div className="flex gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTheme(t)}
                        className={`flex-1 py-2.5 rounded-xl text-sm border transition-all duration-150 ${
                          selectedTheme === t
                            ? 'border-accent/70 bg-accent/10 text-accent'
                            : 'border-white/10 text-muted hover:border-white/20 hover:text-softText'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-softText mb-3">Font size</label>
                  <div className="flex gap-2">
                    {['Small', 'Default', 'Large'].map((s) => (
                      <button
                        key={s}
                        className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-muted hover:border-white/20 hover:text-softText transition-all duration-150"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-softText mb-3">Chat density</label>
                  <div className="flex gap-2">
                    {['Compact', 'Comfortable', 'Spacious'].map((s) => (
                      <button
                        key={s}
                        className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-muted hover:border-white/20 hover:text-softText transition-all duration-150 truncate px-1"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'model' && (
              <div className="space-y-2">
                <p className="text-sm text-muted mb-4">
                  Choose which model responds to your messages.
                </p>
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 border text-left transition-all duration-150 ${
                      selectedModel === m.id
                        ? 'border-accent/70 bg-accent/8'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${selectedModel === m.id ? 'text-white' : 'text-softText'}`}>
                        {m.label}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{m.desc}</p>
                    </div>
                    {selectedModel === m.id && (
                      <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                    {selectedModel !== m.id && (
                      <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <Toggle
                  label="Memory"
                  desc="Let CodeFlex AI remember context across conversations."
                  enabled={memoryEnabled}
                  onToggle={() => setMemoryEnabled((v) => !v)}
                />
                <Toggle
                  label="Improve with my data"
                  desc="Allow your conversations to help train future models."
                  enabled={trainingEnabled}
                  onToggle={() => setTrainingEnabled((v) => !v)}
                />
                <button className="w-full text-left px-4 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-sm text-softText hover:text-white transition-all duration-150 flex items-center justify-between">
                  Delete all data
                  <ChevronRight className="w-4 h-4 text-muted" />
                </button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <Toggle
                  label="Push notifications"
                  desc="Get notified when CodeFlex AI responds to long tasks."
                  enabled={notifEnabled}
                  onToggle={() => setNotifEnabled((v) => !v)}
                />
                <Toggle
                  label="Weekly digest"
                  desc="A summary of your activity and AI insights every week."
                  enabled={false}
                  onToggle={() => {}}
                />
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-white/8 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-softText hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accentDim text-black transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  enabled,
  onToggle,
}: {
  label: string;
  desc: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.02]">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 mt-0.5 ${
          enabled ? 'bg-accent' : 'bg-white/15'
        }`}
        aria-checked={enabled}
        role="switch"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
