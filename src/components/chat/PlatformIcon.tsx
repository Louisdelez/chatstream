'use client';

interface Props {
  platform: string;
  size?: number;
}

function TwitchIcon({ size = 14 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M3.857 0L1 2.857v18.286h5.714V24l2.857-2.857h2.286L19.714 13.286V0H3.857zm14.143 12.286l-2.857 2.857H10.857l-2.571 2.571v-2.571H4.714V1.714h13.286v10.572z"
        fill="#9146FF"
      />
      <path
        d="M14.571 4.714h-1.714v5.143h1.714V4.714zm-4.857 0H8v5.143h1.714V4.714z"
        fill="#9146FF"
      />
    </svg>
  );
}

function YouTubeIcon({ size = 14 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
        fill="#FF0000"
      />
      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff" />
    </svg>
  );
}

function KickIcon({ size = 14 }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
    >
      <rect width="24" height="24" rx="4" fill="#53FC18" />
      <path
        d="M7 5h3v4h2V5h3v4h-2v2h2v2h-2v2h2v4h-3v-4h-2v4H7v-4h2v-2H7v-2h2V9H7V5z"
        fill="#000"
      />
    </svg>
  );
}

const PLATFORM_ICONS: Record<string, ({ size }: { size: number }) => React.ReactNode> = {
  twitch: TwitchIcon,
  youtube: YouTubeIcon,
  kick: KickIcon,
};

export function PlatformIcon({ platform, size = 14 }: Props) {
  const Icon = PLATFORM_ICONS[platform];
  if (!Icon) return null;
  return <>{Icon({ size })}</>;
}
