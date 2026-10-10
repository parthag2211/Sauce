import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { useClerk, useUser } from '@clerk/react';
import { getGetHiringUploadQueryKey, useGetHiringUpload } from '@workspace/api-client-react';
import { AlertTriangle, LogOut, Play, RefreshCw, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Brand({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2 font-extrabold leading-none" style={{ fontSize: size, letterSpacing: '-2px' }}>
      <img src={`${basePath}/favicon.svg`} alt="" width={size + 6} height={size + 6} className="rounded-[10px]" />
      Sauce
      <span className="self-start text-[13px] tracking-normal text-[var(--orange)]" style={{ marginTop: 2 }}>hiring</span>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/workspace', label: 'Workspace' },
    { href: '/opportunities/new', label: 'New opportunity' },
    { href: '/profile', label: 'Applicant profile' },
  ];
  return (
    <div className="min-h-[100dvh]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-[var(--ink)] focus:p-3 focus:text-[var(--paper)]">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] w-[min(1200px,calc(100%-40px))] items-center justify-between gap-4">
          <Link href="/workspace" data-testid="link-home" aria-label="Sauce hiring workspace"><Brand size={26} /></Link>
          <nav className="hidden items-center gap-7 text-[12px] font-semibold md:flex" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} data-testid={`link-nav-${l.href.slice(1).replace('/', '-')}`} className="hover:text-[var(--orange)]">{l.label}</Link>
            ))}
            <span className="text-[var(--muted-ink)]" data-testid="text-user">{user?.firstName || user?.primaryEmailAddress?.emailAddress}</span>
            <button type="button" className="pill pill-outline pill-sm" data-testid="button-sign-out" onClick={() => signOut({ redirectUrl: basePath || '/' })}>
              Sign out <LogOut size={13} />
            </button>
          </nav>
          <button type="button" className="pill pill-outline pill-sm md:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="button-menu">{open ? 'Close' : 'Menu'}</button>
        </div>
        {open && (
          <nav className="border-t border-[var(--line)] px-5 py-3 md:hidden" aria-label="Mobile">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-[15px] font-semibold">{l.label}</Link>
            ))}
            <button type="button" className="py-3 text-[15px] font-semibold text-[var(--orange)]" onClick={() => signOut({ redirectUrl: basePath || '/' })}>Sign out</button>
          </nav>
        )}
      </header>
      <main id="main" className="mx-auto w-[min(1200px,calc(100%-40px))] pb-24 pt-10">{children}</main>
    </div>
  );
}

export function TestModeBanner() {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-[#e6ae9c] bg-[#fdeee4] px-4 py-3 text-[12px]" data-testid="banner-test-mode">
      <span className="chip chip-orange"><span className="dot" />Internal test mode</span>
      <span className="text-[#6b3a2c]">Use synthetic test data only. No real candidates, no real personal details.</span>
    </div>
  );
}

export function ConflictBanner({ message, onRefresh, onDismiss }: { message: string | null; onRefresh: () => void; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-6 flex flex-wrap items-start gap-3 rounded-lg border border-[#d9ac99] bg-[#fff4ec] p-4" data-testid="banner-conflict">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--orange)]" />
      <p className="flex-1 text-[13px]">{message}</p>
      <button type="button" className="pill pill-dark pill-sm" onClick={onRefresh} data-testid="button-refresh-conflict"><RefreshCw size={12} /> Refresh</button>
      <button type="button" className="pill pill-ghost pill-sm" onClick={onDismiss} aria-label="Dismiss"><X size={14} /></button>
    </div>
  );
}

export function ErrorState({ title = 'Could not load this', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="sheet mx-auto max-w-lg p-8 text-center" role="alert" data-testid="state-error">
      <p className="eyebrow text-[var(--orange)]">Problem</p>
      <h2 className="mt-3 text-[34px]">{title}</h2>
      <p className="mt-3 text-[13px] text-[var(--muted-ink)]">{message}</p>
      {onRetry && <button type="button" className="pill pill-dark mt-6" onClick={onRetry} data-testid="button-retry">Try again</button>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-32 bg-[#ebe8dc]" />
      <Skeleton className="h-14 w-2/3 bg-[#ebe8dc]" />
      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <Skeleton className="h-64 bg-[#ebe8dc]" />
        <Skeleton className="h-64 bg-[#ebe8dc]" />
      </div>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#b9c3af] bg-[#f6f5ec] px-6 py-10 text-center">
      <WaveMark className="mx-auto text-[#b9c3af]" />
      <p className="serif mt-3 text-[22px] tracking-tight">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-sm text-[13px] text-[var(--muted-ink)]">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const BARS = [8, 16, 11, 22, 14, 26, 18, 10, 20, 13, 24, 9, 17, 12];
export function WaveMark({ className = '', live = false }: { className?: string; live?: boolean }) {
  return (
    <span className={`wavebars ${live ? 'live-bars' : ''} ${className}`} aria-hidden>
      {BARS.map((h, i) => <i key={i} style={{ height: h, animationDelay: `${i * 0.07}s` }} />)}
    </span>
  );
}

export function TextBlock({ text, className = '' }: { text: string | null | undefined; className?: string }) {
  return <div className={`whitespace-pre-wrap break-words text-[14px] leading-relaxed ${className}`}>{text || ''}</div>;
}

/** Authorized private playback: fetches bytes with cookies only after the user asks. */
export function AudioPlayer({ artifactId, label = 'Recording' }: { artifactId: string; label?: string }) {
  const [enabled, setEnabled] = useState(false);
  const q = useGetHiringUpload(artifactId, {
    query: { enabled: enabled && !!artifactId, queryKey: getGetHiringUploadQueryKey(artifactId), staleTime: Infinity, retry: 1 },
  });
  const blob = q.data;
  const url = useMemo(() => (blob instanceof Blob ? URL.createObjectURL(blob) : null), [blob]);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => { if (url) audioRef.current?.play().catch(() => undefined); }, [url]);

  if (!enabled) {
    return (
      <button type="button" className="flex w-full items-center gap-3 rounded-md bg-[#f5f0e7] px-3 py-2 text-left text-[11px] font-semibold hover:bg-[#efe8da]" onClick={() => setEnabled(true)} data-testid={`button-play-${artifactId}`}>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--orange)] text-[#fff8ed]"><Play size={12} fill="currentColor" /></span>
        <WaveMark className="flex-1 text-[var(--orange)]" />
        <span>{label}</span>
      </button>
    );
  }
  if (q.isLoading) return <Skeleton className="h-11 w-full bg-[#ebe8dc]" />;
  if (q.isError || !url)
    return (
      <div className="flex items-center gap-3 rounded-md bg-[#fff4ec] px-3 py-2 text-[12px]">
        Audio could not be loaded.
        <button type="button" className="font-bold text-[var(--orange)] underline" onClick={() => q.refetch()}>Retry</button>
      </div>
    );
  return <audio ref={audioRef} controls src={url} className="h-11 w-full" data-testid={`audio-${artifactId}`} />;
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-[var(--muted-ink)]">{eyebrow}</p>
        <h2 className="mt-2 text-[30px] md:text-[36px]">{title}</h2>
      </div>
      {children}
    </div>
  );
}
