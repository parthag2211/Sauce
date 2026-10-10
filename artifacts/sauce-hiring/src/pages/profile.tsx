import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ConflictBanner, ErrorState, PageSkeleton, TestModeBanner } from '@/components/kit';
import { TextFileUpload } from '@/components/uploaders';
import { as, errorMessage, useHiringCommand, useWorkspace, type Applicant, type Upload } from '@/lib/hiring';

const blank: Applicant = { name: '', credentials: '', workProposal: '', contactInformation: { email: '', phone: '', linkedin: '' }, references: '' };

export default function ProfilePage() {
  const ws = useWorkspace();
  const cmd = useHiringCommand();
  const { toast } = useToast();
  const [form, setForm] = useState<Applicant>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initRev = useRef<string | null>(null);
  const applicant = ws.data?.applicant ? as<Applicant>(ws.data.applicant) : null;
  const uploads = (ws.data?.uploads ?? []).map((u) => as<Upload>(u));
  const nameOf = (id?: string) => (id ? uploads.find((u) => u.id === id)?.data.name ?? 'Attached file' : '');

  useEffect(() => {
    const key = applicant ? `${applicant.id}:${applicant.revision}` : 'none';
    if (ws.data && initRev.current === null) {
      initRev.current = key;
      if (applicant) setForm({ ...blank, ...applicant.data, contactInformation: { ...blank.contactInformation, ...applicant.data.contactInformation } });
    }
  }, [ws.data, applicant]);

  if (ws.isLoading) return <PageSkeleton />;
  if (ws.isError || !ws.data) return <ErrorState message={errorMessage(ws.error)} onRetry={() => ws.refetch()} />;

  const set = (k: keyof Applicant, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setC = (k: keyof Applicant['contactInformation'], v: string) => setForm((f) => ({ ...f, contactInformation: { ...f.contactInformation, [k]: v } }));
  const stale = applicant && initRev.current !== null && initRev.current !== `${applicant.id}:${applicant.revision}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!form.name.trim()) er.name = 'Name is required.';
    if (!form.credentials.trim()) er.credentials = 'Credentials are required.';
    if (!form.workProposal.trim()) er.workProposal = 'A work proposal is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.contactInformation.email.trim())) er.email = 'A valid email is required.';
    setErrors(er);
    if (Object.keys(er).length) return;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      credentials: form.credentials.trim(),
      workProposal: form.workProposal.trim(),
      contactInformation: { email: form.contactInformation.email.trim(), phone: form.contactInformation.phone.trim(), linkedin: form.contactInformation.linkedin.trim() },
      references: form.references.trim(),
    };
    if (form.credentialArtifactId) payload.credentialArtifactId = form.credentialArtifactId;
    if (form.proposalArtifactId) payload.proposalArtifactId = form.proposalArtifactId;
    try {
      const rec = await cmd.run({ action: 'saveApplicant', ...(applicant ? { targetId: applicant.id, expectedRevision: applicant.revision } : {}), payload });
      initRev.current = `${rec.id}:${rec.revision}`;
      toast({ title: 'Profile saved' });
    } catch (e) {
      toast({ title: 'Profile not saved', description: errorMessage(e), variant: 'destructive' });
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <TestModeBanner />
      <ConflictBanner message={cmd.conflict} onRefresh={() => { initRev.current = null; cmd.refresh(); }} onDismiss={cmd.dismiss} />
      <p className="eyebrow text-[var(--muted-ink)]">Applicant profile</p>
      <h1 className="mt-3 text-[44px] md:text-[60px]">{applicant ? <>Keep it <em>current.</em></> : <>Introduce <em>yourself.</em></>}</h1>
      <p className="mt-4 max-w-xl text-[14px] text-[var(--muted-ink)]">This profile is copied into an application at the moment you submit it. Later edits do not change what a manager already received.</p>
      {stale && (
        <div className="mt-6 rounded-md border border-[#b6c2df] bg-[#e7ecf6] p-3 text-[12px]">
          A newer version of your profile exists on the server.
          <button type="button" className="ml-2 font-bold underline" onClick={() => { initRev.current = null; ws.refetch(); }}>Load latest (discards your unsaved edits)</button>
        </div>
      )}
      <form onSubmit={submit} className="mt-10 space-y-8" noValidate>
        <div className="grid gap-5 md:grid-cols-2">
          <F label="Full name" err={errors.name}><input className="inp" value={form.name} onChange={(e) => set('name', e.target.value)} data-testid="input-name" /></F>
          <F label="Email" err={errors.email}><input type="email" className="inp" value={form.contactInformation.email} onChange={(e) => setC('email', e.target.value)} data-testid="input-email" /></F>
          <F label="Phone (optional)"><input className="inp" value={form.contactInformation.phone} onChange={(e) => setC('phone', e.target.value)} data-testid="input-phone" /></F>
          <F label="LinkedIn (optional)"><input className="inp" value={form.contactInformation.linkedin} onChange={(e) => setC('linkedin', e.target.value)} data-testid="input-linkedin" /></F>
        </div>
        <F label="Credentials" err={errors.credentials} hint="Experience, education, what you have actually done. Plain text."><textarea className="inp" value={form.credentials} onChange={(e) => set('credentials', e.target.value)} data-testid="input-credentials" /></F>
        <div className="sheet p-4"><TextFileUpload id="credential-file" label="Credentials document (optional)" uploaded={form.credentialArtifactId ? { id: form.credentialArtifactId, name: nameOf(form.credentialArtifactId) } : null} onUploaded={(u) => setForm((f) => ({ ...f, credentialArtifactId: u.id }))} /></div>
        <F label="Work proposal" err={errors.workProposal} hint="What would you do in your first months? Be concrete."><textarea className="inp min-h-[140px]" value={form.workProposal} onChange={(e) => set('workProposal', e.target.value)} data-testid="input-work-proposal" /></F>
        <div className="sheet p-4"><TextFileUpload id="proposal-file" label="Proposal document (optional)" uploaded={form.proposalArtifactId ? { id: form.proposalArtifactId, name: nameOf(form.proposalArtifactId) } : null} onUploaded={(u) => setForm((f) => ({ ...f, proposalArtifactId: u.id }))} /></div>
        <F label="References (optional)" hint="Plain text. Synthetic test references only."><textarea className="inp" value={form.references} onChange={(e) => set('references', e.target.value)} data-testid="input-references" /></F>
        <div className="flex items-center gap-4 border-t border-[var(--line)] pt-6">
          <button type="submit" className="pill pill-dark" disabled={!!cmd.pendingAction} data-testid="button-save-profile">{cmd.pendingAction ? 'Saving...' : 'Save profile'}</button>
          {applicant && <span className="text-[11px] text-[var(--muted-ink)]">Revision {applicant.revision}</span>}
        </div>
      </form>
    </div>
  );
}

function F({ label, err, hint, children }: { label: string; err?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && !err && <small>{hint}</small>}
      {err && <small role="alert" className="!text-[#a8321d]">{err}</small>}
    </label>
  );
}
