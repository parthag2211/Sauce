import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5">
      <div className="max-w-md text-center">
        <p className="eyebrow text-[var(--orange)]">404</p>
        <h1 className="mt-4 text-[52px]">Nothing <em>said</em> here.</h1>
        <p className="mt-3 text-[14px] text-[var(--muted-ink)]">This page does not exist or has moved.</p>
        <Link href="/" className="pill pill-dark mt-6" data-testid="link-home-404">Back to start</Link>
      </div>
    </div>
  );
}
