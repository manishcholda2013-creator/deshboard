import { useState } from 'react';
import { MessageSquare, ImageIcon, Video, Sparkles, FileText } from 'lucide-react';
import { ChatTab } from '@/components/ChatTab';
import { ImageTab } from '@/components/ImageTab';
import { VideoTab } from '@/components/VideoTab';
import { ScriptTab } from '@/components/ScriptTab';
import { GoogleSignInModal } from '@/components/GoogleSignInModal';
import type { TabId } from '@/types';

const AUTH_KEY = 'danosu.auth.v1';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { id: 'script', label: 'Script', icon: <FileText className="w-4 h-4" /> },
];

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  const handleSignIn = () => {
    setSignedIn(true);
    try {
      localStorage.setItem(AUTH_KEY, 'true');
    } catch {
      /* ignore */
    }
  };

  if (!signedIn) {
    return <GoogleSignInModal onSignIn={handleSignIn} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-white">
      {/* Left rail with brand + tab switcher */}
      <nav className="hidden sm:flex w-[68px] shrink-0 bg-sidebar flex-col items-center py-4 gap-2 border-r border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl transition-all duration-200 w-full ${
              activeTab === t.id
                ? 'text-accent bg-accent/8'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {t.icon}
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Mobile tab bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around bg-sidebar border-t border-white/8 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${
              activeTab === t.id ? 'text-accent' : 'text-muted hover:text-white'
            }`}
          >
            {t.icon}
            <span className="text-[10px]">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 pb-14 sm:pb-0">
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'image' && <ImageTab />}
        {activeTab === 'video' && <VideoTab />}
        {activeTab === 'script' && <ScriptTab />}
      </main>
    </div>
  );
}
