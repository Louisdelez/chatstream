'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Type,
  AlignJustify,
  Minus,
  Plus,
  Home,
  Pin,
  Highlighter,
  ChevronDown,
  Filter,
  Check,
  Sun,
  Moon,
  Menu,
  FileText,
  Maximize,
  Bell,
  UserX,
  Calendar,
  Share2,
  LogIn,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useChannelStore } from '@/stores/channelStore';
import { useChatStore } from '@/stores/chatStore';
import { usePinStore, TextStyle } from '@/stores/pinStore';
import { useFilterStore } from '@/stores/filterStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMuteStore, KNOWN_BOTS } from '@/stores/muteStore';
import { useAuthStore } from '@/stores/authStore';
import { ConnectionStatusIndicator } from './ConnectionStatus';
import { ExportMenu } from '@/components/export/ExportMenu';
import { UserMenu } from '@/components/auth/UserMenu';
import { ShareModal } from '@/components/chat/ShareModal';
import { UserRole, ChatMessage } from '@/types';
import type { StreamStatus } from '@/hooks/useStreamStatus';
import { ROLE_LABELS } from '@/lib/constants';

const FILTER_ROLES: UserRole[] = ['broadcaster', 'moderator', 'vip', 'subscriber'];

const HIGHLIGHT_COLORS = [
  { name: 'Jaune', color: '#fef08a' },
  { name: 'Vert', color: '#bbf7d0' },
  { name: 'Bleu', color: '#bfdbfe' },
  { name: 'Rose', color: '#fbcfe8' },
  { name: 'Orange', color: '#fed7aa' },
  { name: 'Rouge', color: '#fecaca' },
  { name: 'Violet', color: '#e9d5ff' },
];

interface Props {
  filteredMessages: ChatMessage[];
  channel: string;
  allMessages: ChatMessage[];
  onOpenArchives: () => void;
  streamInfo: {
    status: StreamStatus;
    title: string;
    gameName: string;
    viewerCount: number;
    avatar: string;
  };
}

function getSelectionInfo(): {
  messageId: string;
  text: string;
  start: number;
  end: number;
  message: ChatMessage | null;
} | null {
  const selection = window.getSelection();
  if (!selection || !selection.toString().trim()) return null;

  const text = selection.toString().trim();

  // Walk up from the selection anchor to find the message container
  let node: Node | null = selection.anchorNode;
  while (node) {
    if (node instanceof HTMLElement) {
      const msgId = node.getAttribute('data-message-id');
      if (msgId) {
        // Find position of selected text in the message body
        const bodyEl = node.querySelector(`[data-msg-body="${msgId}"]`);
        const fullText = bodyEl?.textContent ?? '';
        const idx = fullText.indexOf(text);
        return {
          messageId: msgId,
          text,
          start: idx !== -1 ? idx : 0,
          end: idx !== -1 ? idx + text.length : text.length,
          message: null, // will be resolved by caller
        };
      }
    }
    node = node.parentNode;
  }
  return null;
}

export function ChatToolbar({ filteredMessages, channel, allMessages, streamInfo, onOpenArchives }: Props) {
  const router = useRouter();
  const status = useChatStore((s) => s.status);
  const toggleSidebar = useChannelStore((s) => s.toggleSidebar);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const panelOpen = usePinStore((s) => s.panelOpen);
  const togglePanel = usePinStore((s) => s.togglePanel);
  const pinCount = usePinStore((s) => s.pins.filter((p) => p.channel === channel).length);
  const addFormat = usePinStore((s) => s.addFormat);
  const removeFormat = usePinStore((s) => s.removeFormat);
  const allFormats = usePinStore((s) => s.formats);
  const addPin = usePinStore((s) => s.addPin);
  const setPanel = usePinStore((s) => s.setPanel);
  const roles = useFilterStore((s) => s.roles);
  const setRoles = useFilterStore((s) => s.setRoles);
  const keyword = useFilterStore((s) => s.keyword);
  const setKeyword = useFilterStore((s) => s.setKeyword);

  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const compact = useSettingsStore((s) => s.compact);
  const toggleCompact = useSettingsStore((s) => s.toggleCompact);
  const showTimestamps = useSettingsStore((s) => s.showTimestamps);
  const toggleTimestamps = useSettingsStore((s) => s.toggleTimestamps);
  const showPlatform = useSettingsStore((s) => s.showPlatform);
  const togglePlatform = useSettingsStore((s) => s.togglePlatform);
  const showBadges = useSettingsStore((s) => s.showBadges);
  const toggleBadges = useSettingsStore((s) => s.toggleBadges);

  const showUsername = useSettingsStore((s) => s.showUsername);
  const toggleUsername = useSettingsStore((s) => s.toggleUsername);
  const pageLayout = useSettingsStore((s) => s.pageLayout);
  const setPageLayout = useSettingsStore((s) => s.setPageLayout);
  const showSubs = useSettingsStore((s) => s.showSubs);
  const toggleSubs = useSettingsStore((s) => s.toggleSubs);
  const showGiftSubs = useSettingsStore((s) => s.showGiftSubs);
  const toggleGiftSubs = useSettingsStore((s) => s.toggleGiftSubs);
  const showPrime = useSettingsStore((s) => s.showPrime);
  const togglePrime = useSettingsStore((s) => s.togglePrime);
  const showBits = useSettingsStore((s) => s.showBits);
  const toggleBits = useSettingsStore((s) => s.toggleBits);
  const showRaids = useSettingsStore((s) => s.showRaids);
  const toggleRaids = useSettingsStore((s) => s.toggleRaids);

  const appUser = useAuthStore((s) => s.appUser);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeHighlightColor, setActiveHighlightColor] = useState('#fef08a');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showEventMenu, setShowEventMenu] = useState(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const mutedUsers = useMuteStore((s) => s.mutedUsers);
  const muteHost = useMuteStore((s) => s.muteHost);
  const toggleMuteUser = useMuteStore((s) => s.toggleMuteUser);
  const toggleMuteHost = useMuteStore((s) => s.toggleMuteHost);
  const [hasSelection, setHasSelection] = useState(false);
  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());

  // Track selection + detect active styles
  useEffect(() => {
    const checkSelection = () => {
      const sel = window.getSelection();
      const hasSel = !!(sel && sel.toString().trim());
      setHasSelection(hasSel);

      if (hasSel) {
        const info = getSelectionInfo();
        if (info) {
          const styles = new Set<string>();
          for (const f of allFormats) {
            if (f.messageId === info.messageId && f.start <= info.start && f.end >= info.end) {
              styles.add(f.style);
            }
          }
          setActiveStyles(styles);
        } else {
          setActiveStyles(new Set());
        }
      } else {
        setActiveStyles(new Set());
      }
    };
    document.addEventListener('selectionchange', checkSelection);
    return () => document.removeEventListener('selectionchange', checkSelection);
  }, [allFormats]);

  // Debounced keyword
  const [localKeyword, setLocalKeyword] = useState(keyword);
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(localKeyword), 300);
    return () => clearTimeout(timer);
  }, [localKeyword, setKeyword]);

  const handleHighlight = useCallback(
    (color?: string) => {
      const c = color ?? activeHighlightColor;
      const info = getSelectionInfo();
      if (info) {
        // Check if already highlighted
        const existing = allFormats.find(
          (f) => f.messageId === info.messageId && f.start === info.start && f.end === info.end && f.style === 'highlight'
        );
        if (existing) {
          removeFormat(info.messageId, info.start, info.end, 'highlight');
        } else {
          addFormat({ messageId: info.messageId, start: info.start, end: info.end, style: 'highlight', color: c });
        }
        setShowColorPicker(false);
      }
    },
    [activeHighlightColor, addFormat, removeFormat, allFormats]
  );

  const handleTextStyle = useCallback(
    (style: TextStyle) => {
      const info = getSelectionInfo();
      if (info) {
        // Toggle: remove if already applied, add if not
        const existing = allFormats.find(
          (f) => f.messageId === info.messageId && f.start === info.start && f.end === info.end && f.style === style
        );
        if (existing) {
          removeFormat(info.messageId, info.start, info.end, style);
        } else {
          addFormat({ messageId: info.messageId, start: info.start, end: info.end, style });
        }
      }
    },
    [addFormat, removeFormat, allFormats]
  );

  const handlePin = useCallback(() => {
    const info = getSelectionInfo();
    if (!info) return;

    const msg = allMessages.find((m) => m.id === info.messageId);
    if (!msg) return;

    addPin({
      messageId: msg.id,
      channel: msg.channel,
      displayName: msg.displayName,
      color: msg.color,
      text: info.text,
      fullMessage: msg.message,
      timestamp: msg.timestamp,
    });
    setPanel(true);
    window.getSelection()?.removeAllRanges();
  }, [allMessages, addPin, setPanel]);

  const toggleRole = (role: UserRole) => {
    if (roles === 'all') {
      setRoles([role]);
    } else if (roles.includes(role)) {
      const next = roles.filter((r) => r !== role);
      setRoles(next.length === 0 ? 'all' : next);
    } else {
      setRoles([...roles, role]);
    }
  };

  return (
    <div className="no-print border-b shadow-sm" style={{ background: 'var(--bg-toolbar)', borderColor: 'var(--border)' }}>
      {/* Row 1: Channel info + actions */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--text-muted)' }}
            title="Chaînes"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-lg transition"
            style={{ color: 'var(--text-muted)' }}
            title="Accueil"
          >
            <Home className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            {streamInfo.avatar && (
              <img
                src={streamInfo.avatar}
                alt={channel}
                className="w-7 h-7 rounded-full"
              />
            )}
            <h1 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{channel}</h1>
          </div>
          <ConnectionStatusIndicator
            status={status}
            streamStatus={streamInfo.status}
            viewerCount={streamInfo.viewerCount}
            gameName={streamInfo.gameName}
          />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenArchives}
            className="tb-btn flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm rounded-lg border transition"
            title="Archives"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Archives</span>
          </button>
          <button
            onClick={togglePanel}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm rounded-lg border transition ${
              panelOpen ? 'tb-active' : 'tb-btn'
            }`}
          >
            <Pin className="w-4 h-4" />
            <span className="hidden sm:inline">Épingles</span>
            {pinCount > 0 && (
              <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pinCount}
              </span>
            )}
          </button>
          {appUser && (
            <button
              onClick={() => setShowShareModal(true)}
              className="tb-btn flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-sm rounded-lg border transition"
              title="Partager"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border transition"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-document)' }}
            title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <Sun className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            )}
          </button>
          <ExportMenu messages={filteredMessages} channel={channel} />
          {appUser ? (
            <UserMenu user={appUser} />
          ) : (
            <a
              href="/login"
              className="tb-btn flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm rounded-lg border transition"
              title="Se connecter"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Se connecter</span>
            </a>
          )}
        </div>
      </div>

      {/* Row 2: Highlight + Pin tools + Filters + Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 border-t flex-wrap" style={{ borderColor: 'var(--border-light)' }}>
        {/* Highlighter button with color picker */}
        <div className="relative flex items-center gap-0.5">
          <button
            onClick={() => handleHighlight()}
            disabled={!hasSelection}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-l-lg border transition ${
              hasSelection && activeStyles.has('highlight') ? 'tb-active' : 'tb-btn'
            }`}
            title={hasSelection ? 'Surligner la sélection' : 'Sélectionnez du texte dans le chat'}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="w-4 h-3 rounded-sm" style={{ backgroundColor: activeHighlightColor, border: '1px solid var(--border-btn)' }} />
          </button>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="tb-btn px-1 py-1.5 text-xs rounded-r-lg border border-l-0 transition"
            title="Choisir la couleur"
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          {showColorPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
              <div className="tb-dropdown absolute left-0 top-full mt-1 z-20 rounded-lg shadow-lg border p-2">
                <p className="text-xs tb-text mb-2 px-1">Couleur du surligneur</p>
                <div className="flex gap-1.5">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => {
                        setActiveHighlightColor(c.color);
                        if (hasSelection) handleHighlight(c.color);
                        setShowColorPicker(false);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition hover:scale-110 ${
                        activeHighlightColor === c.color ? 'border-gray-500 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Text formatting buttons: B I U S */}
        <div className="flex items-center gap-0.5">
          {(['bold', 'italic', 'underline', 'strikethrough'] as const).map((style) => {
            const isActive = hasSelection && activeStyles.has(style);
            return (
              <button
                key={style}
                onClick={() => handleTextStyle(style)}
                disabled={!hasSelection}
                className={`w-7 h-7 flex items-center justify-center text-xs rounded border transition ${
                  isActive ? 'tb-active' : 'tb-btn'
                } ${style === 'bold' ? 'font-bold' : ''} ${style === 'italic' ? 'italic' : ''} ${style === 'underline' ? 'underline' : ''} ${style === 'strikethrough' ? 'line-through' : ''}`}
                title={{ bold: 'Gras', italic: 'Italique', underline: 'Souligné', strikethrough: 'Barré' }[style]}
              >
                {{ bold: 'B', italic: 'I', underline: 'U', strikethrough: 'S' }[style]}
              </button>
            );
          })}
        </div>

        <div className="hidden sm:block w-px h-5 tb-separator" />

        {/* Pin selection button */}
        <button
          onClick={handlePin}
          disabled={!hasSelection}
          className="tb-btn flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition"
          title={hasSelection ? 'Épingler la sélection' : 'Sélectionnez du texte dans le chat'}
        >
          <Pin className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Épingler</span>
        </button>

        <div className="hidden sm:block w-px h-5 tb-separator" />

        {/* Role filters dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleFilter(!showRoleFilter)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition ${
              roles !== 'all' ? 'tb-active' : 'tb-btn'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{roles === 'all' ? 'Tous les rôles' : `${roles.length} filtre${roles.length > 1 ? 's' : ''}`}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showRoleFilter && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowRoleFilter(false)} />
              <div className="tb-dropdown absolute left-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[180px]">
                <button onClick={() => setRoles('all')} className="tb-dropdown-item w-full flex items-center gap-3 px-3 py-2 text-sm transition">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center ${roles === 'all' ? 'bg-purple-500 border-purple-500 text-white' : ''}`} style={roles !== 'all' ? { borderColor: 'var(--border-btn)' } : {}}>
                    {roles === 'all' && <Check className="w-3 h-3" />}
                  </span>
                  <span>Tous</span>
                </button>
                <div className="my-1" style={{ borderTop: '1px solid var(--border-light)' }} />
                {FILTER_ROLES.map((role) => {
                  const isChecked = roles !== 'all' && roles.includes(role);
                  return (
                    <button key={role} onClick={() => toggleRole(role)} className="tb-dropdown-item w-full flex items-center gap-3 px-3 py-2 text-sm transition">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-purple-500 border-purple-500 text-white' : ''}`} style={!isChecked ? { borderColor: 'var(--border-btn)' } : {}}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </span>
                      <span>{ROLE_LABELS[role]}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="hidden sm:block w-px h-5 tb-separator" />

        {/* Events filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowEventMenu(!showEventMenu)}
            className="tb-btn flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Événements</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showEventMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEventMenu(false)} />
              <div className="tb-dropdown absolute left-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[180px]">
                {([
                  { label: 'Abonnements', checked: showSubs, toggle: toggleSubs },
                  { label: 'Dons de sub', checked: showGiftSubs, toggle: toggleGiftSubs },
                  { label: 'Prime', checked: showPrime, toggle: togglePrime },
                  { label: 'Bits', checked: showBits, toggle: toggleBits },
                  { label: 'Raids', checked: showRaids, toggle: toggleRaids },
                ] as const).map((item) => (
                  <button key={item.label} onClick={item.toggle} className="tb-dropdown-item w-full flex items-center gap-3 px-3 py-2 text-sm transition">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${item.checked ? 'bg-purple-500 border-purple-500 text-white' : ''}`} style={!item.checked ? { borderColor: 'var(--border-btn)' } : {}}>
                      {item.checked && <Check className="w-3 h-3" />}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="hidden sm:block w-px h-5 tb-separator" />

        {/* Mute users dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMuteMenu(!showMuteMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition ${
              muteHost || mutedUsers.length > 0 ? 'tb-active' : 'tb-btn'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Masquer</span>
            {(muteHost ? 1 : 0) + mutedUsers.length > 0 && (
              <span className="bg-purple-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {(muteHost ? 1 : 0) + mutedUsers.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showMuteMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMuteMenu(false)} />
              <div className="tb-dropdown absolute left-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[200px] max-h-[350px] overflow-y-auto">
                {/* Host */}
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  Hôte
                </div>
                <button onClick={toggleMuteHost} className="tb-dropdown-item w-full flex items-center gap-3 px-3 py-2 text-sm transition">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center ${muteHost ? 'bg-purple-500 border-purple-500 text-white' : ''}`} style={!muteHost ? { borderColor: 'var(--border-btn)' } : {}}>
                    {muteHost && <Check className="w-3 h-3" />}
                  </span>
                  <span>{channel}</span>
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--text-faint)' }}>streamer</span>
                </button>

                <div className="my-1" style={{ borderTop: '1px solid var(--border-light)' }} />

                {/* Known bots */}
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  Bots connus
                </div>
                {KNOWN_BOTS.map((bot) => {
                  const isMuted = mutedUsers.includes(bot);
                  return (
                    <button key={bot} onClick={() => toggleMuteUser(bot)} className="tb-dropdown-item w-full flex items-center gap-3 px-3 py-1.5 text-sm transition">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${isMuted ? 'bg-purple-500 border-purple-500 text-white' : ''}`} style={!isMuted ? { borderColor: 'var(--border-btn)' } : {}}>
                        {isMuted && <Check className="w-3 h-3" />}
                      </span>
                      <span>{bot}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="hidden sm:block w-px h-5 tb-separator" />

        {/* Keyword search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />
          <input
            type="text"
            value={localKeyword}
            onChange={(e) => setLocalKeyword(e.target.value)}
            placeholder="Rechercher..."
            className="tb-input h-7 pl-8 pr-3 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-purple-400 w-24 sm:w-40"
          />
        </div>

        <div className="hidden sm:block w-px h-5 tb-separator" />

        {/* Font family */}
        <div className="relative">
          <button
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="tb-btn flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition sm:min-w-[110px]"
            style={{ fontFamily: `'${fontFamily}', sans-serif` }}
          >
            <Type className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-faint)' }} />
            <span className="hidden sm:inline truncate">{fontFamily}</span>
            <ChevronDown className="w-3 h-3 shrink-0" />
          </button>

          {showFontMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFontMenu(false)} />
              <div className="tb-dropdown absolute left-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[180px] max-h-[300px] overflow-y-auto">
                {['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Merriweather', 'Source Code Pro', 'Nunito', 'PT Serif'].map((font) => (
                  <button
                    key={font}
                    onClick={() => { setFontFamily(font); setShowFontMenu(false); }}
                    className={`tb-dropdown-item w-full flex items-center gap-3 px-3 py-2 text-sm transition ${fontFamily === font ? 'tb-active' : ''}`}
                    style={{ fontFamily: `'${font}', sans-serif` }}
                  >
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${fontFamily === font ? 'bg-purple-500 border-purple-500 text-white' : ''}`} style={fontFamily !== font ? { borderColor: 'var(--border-btn)' } : {}}>
                      {fontFamily === font && <Check className="w-3 h-3" />}
                    </span>
                    <span>{font}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Font size */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setFontSize(Math.max(8, fontSize - 1))} className="p-1 rounded transition" style={{ color: 'var(--text-muted)' }}>
            <Minus className="w-3 h-3" />
          </button>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="tb-input h-7 px-1 text-xs rounded border text-center appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-400 w-12"
          >
            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => setFontSize(Math.min(36, fontSize + 1))} className="p-1 rounded transition" style={{ color: 'var(--text-muted)' }}>
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="hidden sm:block w-px h-5 tb-separator" />

        {/* Columns & display dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="tb-btn flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition"
          >
            <AlignJustify className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Affichage</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showColumnMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)} />
              <div className="tb-dropdown absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[180px]">
                {([
                  { label: 'Heure', checked: showTimestamps, toggle: toggleTimestamps },
                  { label: 'Plateforme', checked: showPlatform, toggle: togglePlatform },
                  { label: 'Rôle', checked: showBadges, toggle: toggleBadges },
                  { label: 'Pseudo', checked: showUsername, toggle: toggleUsername },
                ] as const).map((item) => (
                  <button key={item.label} onClick={item.toggle} className="tb-dropdown-item w-full flex items-center gap-3 px-3 py-2 text-sm transition">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${item.checked ? 'bg-purple-500 border-purple-500 text-white' : ''}`} style={!item.checked ? { borderColor: 'var(--border-btn)' } : {}}>
                      {item.checked && <Check className="w-3 h-3" />}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ))}
                <div className="my-1" style={{ borderTop: '1px solid var(--border-light)' }} />
                <button onClick={toggleCompact} className="tb-dropdown-item w-full flex items-center gap-3 px-3 py-2 text-sm transition">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center ${compact ? 'bg-purple-500 border-purple-500 text-white' : ''}`} style={!compact ? { borderColor: 'var(--border-btn)' } : {}}>
                    {compact && <Check className="w-3 h-3" />}
                  </span>
                  <span>Mode compact</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden sm:block w-px h-5 tb-separator" />

        {/* Page layout toggle */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setPageLayout('page')}
            className={`p-1.5 rounded-lg border transition ${pageLayout === 'page' ? 'tb-active' : 'tb-btn'}`}
            title="Mode page"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPageLayout('full')}
            className={`p-1.5 rounded-lg border transition ${pageLayout === 'full' ? 'tb-active' : 'tb-btn'}`}
            title="Pleine largeur"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showShareModal && (
        <ShareModal channel={channel} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
