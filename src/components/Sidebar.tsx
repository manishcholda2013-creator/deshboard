import { useState } from 'react';
import { Plus, Trash2, Settings, X, MessageSquare, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import type { Conversation } from '@/types';
import { SettingsModal } from './SettingsModal';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  collapsed: boolean;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onToggle: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  collapsed,
  onNewChat,
  onSelect,
  onDelete,
  onClearAll,
  onToggle,
}: SidebarProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const user = auth.currentUser;
  const displayName = user?.displayName ?? 'User';
  const photoURL = user?.photoURL ?? null;
  const email = user?.email ?? '';
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => signOut(auth);

  if (collapsed) {
    return (
      <>
        <aside className="hidden sm:flex w-[60px] shrink-0 bg-sidebar flex-col items-center py-4 gap-4 border-r border-white/5">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-sidebarHover text-muted hover:text-white transition-colors"
            aria-label="Expand sidebar"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onNewChat}
            className="p-2 rounded-lg hover:bg-sidebarHover text-muted hover:text-white transition-colors"
            aria-label="New chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <div className="mt-auto flex flex-col items-center gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-sidebarHover text-muted hover:text-white transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center text-sm font-semibold text-white">
                {initial}
              </div>
            )}
          </div>
        </aside>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="sm:hidden fixed inset-0 bg-black/60 z-30 animate-fade-in"
        onClick={onToggle}
      />
      <aside className="fixed sm:static z-40 w-[260px] sm:w-[260px] shrink-0 h-full bg-sidebar flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="px-2 text-sm font-semibold text-white tracking-tight">
            CodeFlex AI
          </span>
          <button
            onClick={onToggle}
            className="sm:hidden p-1.5 rounded-lg hover:bg-sidebarHover text-muted hover:text-white transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New chat + clear */}
        <div className="px-3 pb-2 flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-sidebarHover px-3 py-2.5 text-sm font-medium text-softText hover:text-white transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
          <button
            onClick={() => setConfirmClear(true)}
            disabled={conversations.length === 0}
            className="p-2.5 rounded-lg border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 text-muted hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Clear all chats"
            title="Clear all chats"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Chat list */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted/60 text-center italic">
              No recent chats
            </p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id}>
                  <div
                    className={`group flex items-center rounded-lg transition-all duration-150 ${
                      c.id === activeId
                        ? 'bg-sidebarActive text-white'
                        : 'text-muted hover:bg-sidebarHover hover:text-softText'
                    }`}
                  >
                    <button
                      onClick={() => onSelect(c.id)}
                      className="flex-1 text-left px-3 py-2.5 text-sm truncate"
                    >
                      {c.title}
                    </button>
                    <button
                      onClick={() => onDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 mr-1 rounded-md hover:bg-red-500/15 text-muted hover:text-red-400 transition-all duration-150"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* Account footer */}
        <div className="px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-3 rounded-lg hover:bg-sidebarHover px-2 py-2 transition-colors">
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{displayName}</p>
              <p className="text-xs text-muted truncate">{email || 'Free plan'}</p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-md hover:bg-sidebarActive text-muted hover:text-white transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md hover:bg-red-500/15 text-muted hover:text-red-400 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Clear-all confirmation modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-[#2a2a2a] rounded-2xl border border-white/10 max-w-sm w-full p-5 shadow-2xl animate-fade-in-up">
            <h3 className="text-white font-semibold text-base">Clear all chats?</h3>
            <p className="mt-2 text-sm text-muted">
              This permanently deletes every conversation. This can't be undone.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 rounded-lg text-sm text-softText hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/90 hover:bg-red-500 text-white transition-colors"
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
