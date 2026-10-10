import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { Brand, WaveMark } from '@/components/kit';

const steps = [
  { n: '01', k: 'Manager', t: 'Write the context, then say the vision out loud.', p: 'Upload your organization and job description as plain Markdown. Record what the role is really for, in your own voice. Draft up to three questions and approve them before anything goes live.' },
  { n: '02', k: 'Applicant', t: 'Answer by voice. Retake as often as you like.', p: 'Build a profile once. Record an answer, listen back, try again. Earlier takes stay on file. You choose which take represents you and confirm its transcript yourself.' },
  { n: '03', k: 'Both', t: 'Ask questions without risking your screening.', p: 'Applicants can ask the manager about the role. Inquiries sit apart from the application, and replies are visible on the opportunity.' },
  { n: '04', k: 'Manager', t: 'Decide as a person. Every step is recorded.', p: 'Submitted evidence is pinned exactly as sent: recording, original transcript status and reviewed text. Shortlist, offer, accept, hire, with a history of each change.' },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] overflow-x-clip">
      <header className="mx-auto flex h-[88px] w-[min(1200px,calc(100%-40px))] items-center justify-between border-b border-[var(--line)]">
        <Brand />
        <nav className="flex items-center gap-3 text-[12px] font-semibold">
          <Link href="/sign-in" className="hidden px-3 sm:inline" data-testid="link-sign-in">Sign in</Link>
          <Link href="/sign-up" className="pill pill-dark" data-testid="link-sign-up">Get started <ArrowRight size={13} /></Link>
        </nav>
      </header>

      <section className="mx-auto grid w-[min(1200px,calc(100%-40px))] items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="rise">
          <p className="eyebrow"><span className="dot mr-2 align-[2px]" />Hiring, by voice · human reviewed</p>
          <h1 className="mt-6 text-[52px] md:text-[78px]">The job, <em>said plainly.</em> The answer, in their voice.</h1>
          <p className="mt-6 max-w-[440px] text-[16px] leading-[1.75] text-[var(--muted-ink)]">
            Managers and applicants share real evidence: written context, spoken vision, recorded answers with transcripts they have checked. No opaque score decides for anyone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-up" className="pill pill-dark" data-testid="button-hero-start">Create an account <ArrowRight size={13} /></Link>
            <Link href="/sign-in" className="pill pill-outline" data-testid="button-hero-sign-in">I already have one</Link>
          </div>
        </div>

        <div className="relative h-[460px] rise" style={{ animationDelay: '.15s' }} aria-hidden>
          <div className="absolute left-[8%] top-[14%] h-[330px] w-[400px] max-w-[85%] -rotate-[25deg] rounded-[50%] border border-dashed border-[#aeb7a7]" />
          <div className="absolute left-0 top-10 w-[240px] -rotate-[7deg] rounded-[9px] border border-[#dedbcf] bg-[#fffdf7] p-6 shadow-[0_18px_45px_#1e2c2814]">
            <p className="eyebrow text-[8px]">Manager vision · voice</p>
            <h3 className="serif mt-4 text-[30px] leading-[1.1] tracking-[-1.5px]">What this role is for</h3>
            <div className="mt-5 flex items-center gap-2 rounded-md bg-[#f5f0e7] p-2 text-[var(--orange)]"><WaveMark className="flex-1" /></div>
            <div className="mt-4 h-1 w-4/5 rounded bg-[#e1e0d8]" /><div className="mt-2 h-1 w-3/5 rounded bg-[#e1e0d8]" />
          </div>
          <div className="absolute right-0 top-[150px] w-[250px] rotate-[6deg] rounded-[9px] border border-[#cbd5c1] bg-[#e6eddf] p-6 shadow-[0_18px_45px_#1e2c2814]">
            <p className="eyebrow text-[8px]">Answer · take 3 selected</p>
            <p className="serif mt-4 border-t border-[#bfcab5] pt-4 text-[22px] leading-[1.15] tracking-[-.6px]">Reviewed by the person who said it.</p>
            <p className="mt-4 text-[9px] font-bold tracking-[.08em] text-[#59684f]">ORIGINAL TRANSCRIPT KEPT SEPARATE</p>
          </div>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={64} height={64} className="absolute left-[44%] top-[230px] -rotate-6 rounded-[20px] shadow-[0_8px_25px_#e2492f35]" />
        </div>
      </section>

      <div className="border-y border-[#dbe0d2] bg-[#ecefe5]">
        <div className="mx-auto flex w-[min(1200px,calc(100%-40px))] flex-wrap items-center justify-center gap-x-6 gap-y-2 py-5 md:justify-between">
          <span className="eyebrow text-[8px] tracking-[.15em]">What gets shared</span>
          {['Written context', 'Spoken vision', 'Recorded answers', 'Checked transcripts', 'Human decisions'].map((w, i) => (
            <span key={w} className="flex items-center gap-6"><b className="serif text-[18px] font-normal">{w}</b>{i < 4 && <span className="hidden text-[22px] text-[var(--orange)] md:inline">+</span>}</span>
          ))}
        </div>
      </div>

      <section className="mx-auto w-[min(1200px,calc(100%-40px))] py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-xl text-[42px] md:text-[60px]">Four moves. <em>No black box.</em></h2>
          <p className="max-w-[300px] text-[14px] leading-[1.75] text-[var(--muted-ink)]">Each step leaves a record both sides can understand.</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-[var(--line)]">
          {steps.map((s) => (
            <div key={s.n} className="grid gap-4 border-b border-[var(--line)] p-6 last:border-0 md:grid-cols-[60px_160px_1fr] md:p-8">
              <span className="serif text-[27px] italic text-[#a8aea1]">{s.n}</span>
              <span className="eyebrow text-[var(--orange)]">{s.k}</span>
              <div>
                <h3 className="serif text-[26px] leading-[1.15] tracking-[-1px]">{s.t}</h3>
                <p className="mt-2 max-w-xl text-[13px] leading-[1.75] text-[var(--muted-ink)]">{s.p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#23392e] py-20 text-[#f7f4e9]">
        <div className="mx-auto grid w-[min(1200px,calc(100%-40px))] gap-12 md:grid-cols-2">
          <div>
            <p className="eyebrow text-[#c6d1c2]">Honest by default</p>
            <h2 className="mt-5 text-[42px] md:text-[56px]">What Sauce <em className="!text-[#ffa288]">will not</em> pretend.</h2>
          </div>
          <ul className="space-y-6 text-[14px] leading-[1.8] text-[#d3ddcd]">
            <li><b className="text-[#f7f4e9]">No scores yet.</b> Scoring weights and criteria have not been configured or approved. Every assessment shows exactly that, and nothing is ranked.</li>
            <li><b className="text-[#f7f4e9]">Reviewed transcription.</b> With your consent, ElevenLabs transcribes saved recordings. You check and correct the text; manual review remains available if transcription fails. No sentiment or emotion inference.</li>
            <li><b className="text-[#f7f4e9]">Recording privacy.</b> Sauce removes recordings and transcript copies, including submitted copies, 30 days after upload. ElevenLabs uses its <a href="https://elevenlabs.io/privacy-policy" className="underline" target="_blank" rel="noreferrer">standard retention terms</a>; provider logs and backups may remain longer. Email <a className="underline" href="mailto:klvstc@gmail.com">klvstc@gmail.com</a> to request deletion.</li>
          </ul>
        </div>
      </section>

      <section className="bg-[#f4e7d7] py-16">
        <div className="mx-auto flex w-[min(1200px,calc(100%-40px))] flex-wrap items-center justify-between gap-6">
          <h2 className="text-[38px] md:text-[50px]">Start with one opportunity.</h2>
          <Link href="/sign-up" className="pill pill-dark" data-testid="button-footer-start">Create an account <ArrowRight size={13} /></Link>
        </div>
      </section>
      <footer className="mx-auto flex w-[min(1200px,calc(100%-40px))] flex-wrap items-center justify-between gap-4 py-8 text-[10px] text-[var(--muted-ink)]">
        <Brand size={22} />
        <span>Voice transcription is optional. Applicants review all transcript text.</span>
      </footer>
    </div>
  );
}
