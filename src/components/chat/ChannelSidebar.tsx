'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, MessageSquare, Hash } from 'lucide-react';
import { useChannelStore } from '@/stores/channelStore';

interface Props {
  activeChannel: string;
}

export function ChannelSidebar({ activeChannel }: Props) {
  const router = useRouter();
  const channels = useChannelStore((s) => s.channels);
  const sidebarOpen = useChannelStore((s) => s.sidebarOpen);
  const addChannel = useChannelStore((s) => s.addChannel);
  const removeChannel = useChannelStore((s) => s.removeChannel);
  const setSidebar = useChannelStore((s) => s.setSidebar);
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    const name = inputValue.toLowerCase().trim();
    if (name) {
      addChannel(name);
      setInputValue('');
      setShowInput(false);
      router.push(`/chat/${name}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setShowInput(false); setInputValue(''); }
  };

  const handleRemove = (e: React.MouseEvent, channel: string) => {
    e.stopPropagation();
    removeChannel(channel);
    if (channel === activeChannel && channels.length > 1) {
      const remaining = channels.filter((c) => c !== channel);
      router.push(`/chat/${remaining[0]}`);
    } else if (channels.length <= 1) {
      router.push('/');
    }
  };

  // Auto-add active channel
  useEffect(() => {
    if (!channels.includes(activeChannel)) {
      addChannel(activeChannel);
    }
  }, [activeChannel, channels, addChannel]);

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Backdrop overlay on mobile/tablet */}
      <div
        className="lg:hidden fixed inset-0 bg-black/30 z-30"
        onClick={() => setSidebar(false)}
      />
      <div
        className="fixed lg:relative z-40 lg:z-auto w-[220px] shrink-0 flex flex-col h-full border-r"
        style={{ background: 'var(--bg-toolbar)', borderColor: 'var(--border)' }}
      >
      {/* Header — matches full toolbar height (row 1 + row 2) */}
      <div className="flex flex-col justify-center px-3 border-b" style={{ borderColor: 'var(--border)', height: '98px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chaînes</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowInput(!showInput)}
              className="p-1 rounded-lg transition"
              style={{ color: 'var(--text-muted)' }}
              title="Ajouter une chaîne"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebar(false)}
              className="p-1 rounded-lg transition"
              style={{ color: 'var(--text-muted)' }}
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add input */}
      {showInput && (
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="nom_de_la_chaine"
            className="tb-input w-full h-7 px-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-purple-400"
            autoFocus
          />
        </div>
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto pt-4 pb-2">
        {channels.map((channel) => {
          const isActive = channel === activeChannel;
          return (
            <button
              key={channel}
              onClick={() => router.push(`/chat/${channel}`)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition group ${
                isActive ? 'tb-active' : ''
              }`}
              style={!isActive ? { color: 'var(--text-secondary)' } : {}}
            >
              <Hash className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? '#9333ea' : 'var(--text-faint)' }} />
              <span className="truncate flex-1 text-left">{channel}</span>
              <span
                onClick={(e) => handleRemove(e, channel)}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                style={{ color: 'var(--text-faint)' }}
                title="Supprimer"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
    </>
  );
}
