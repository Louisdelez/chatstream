'use client';

import { Radio, Eye, WifiOff, Loader } from 'lucide-react';
import { ConnectionStatus as Status } from '@/types';
import { StreamStatus } from '@/hooks/useStreamStatus';

interface Props {
  status: Status;
  streamStatus: StreamStatus;
  viewerCount: number;
  gameName: string;
}

export function ConnectionStatusIndicator({ status, streamStatus, viewerCount, gameName }: Props) {
  // Connection problems take priority
  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-1.5">
        <Loader className="w-3 h-3 animate-spin" style={{ color: 'var(--text-faint)' }} />
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Connexion...</span>
      </div>
    );
  }

  if (status === 'error' || status === 'disconnected') {
    return (
      <div className="flex items-center gap-1.5">
        <WifiOff className="w-3 h-3 text-red-500" />
        <span className="text-xs text-red-500">
          {status === 'error' ? 'Erreur' : 'Déconnecté'}
        </span>
      </div>
    );
  }

  // Connected — show stream status only
  if (streamStatus === 'live') {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500 text-white">
          <Radio className="w-3 h-3" />
          Live
        </span>
        {viewerCount > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Eye className="w-3 h-3" />
            {viewerCount.toLocaleString('fr-FR')}
          </span>
        )}
        {gameName && (
          <span className="hidden sm:inline text-xs truncate max-w-[150px]" style={{ color: 'var(--text-faint)' }}>
            {gameName}
          </span>
        )}
      </div>
    );
  }

  if (streamStatus === 'offline') {
    return (
      <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
        Hors ligne
      </span>
    );
  }

  // Loading stream status
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Connecté</span>
    </div>
  );
}
