'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

interface Props {
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function UserMenu({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  const initials = (user.name || user.email)[0].toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition overflow-hidden"
        style={{
          background: user.image ? 'transparent' : '#9333ea',
          color: user.image ? 'var(--text-primary)' : 'white',
        }}
      >
        {user.image ? (
          <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="tb-dropdown absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[200px]">
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {user.name || 'Utilisateur'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{user.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="tb-dropdown-item w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
