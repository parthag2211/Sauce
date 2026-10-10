import { useState } from 'react';
import { useLocation } from 'wouter';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioPlayer, ErrorState, PageSkeleton, TestModeBanner } from '@/components/kit';
import { AudioCapture, TextFileUpload } from '@/components/uploaders';
import { as, errorMessage, useHiringCommand, useWorkspace, type Organization } from '@/lib/hiring';

export default function NewOpportunityPage() {
  const ws = useWorkspace();
  const cmd = useHiringCommand();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [orgId, setOrgId] = useState<string>('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [orgMd, setOrgMd] = useState<{ id: string; name: string } | null>(null);
  const [title, setTitle] = useState('');
  const [jd, setJd] = useState<{ id: string; name: string } | null>(null);
  const [vision, setVision] = useState<{ id: string; name: string } | null>(null);
  const [questions, setQuestions] = useState<string[]>(['']);
  const [err, setErr] = useState<string | null>(null);

  if (ws.isLoading) return <PageSkeleton />;
  if (ws.isError || !ws.data) return <ErrorState message={errorMessage(ws.error)} onRetry={() => ws.refetch()} />;
  const orgs = ws.data.organizations.map((o) => as<Organization>(o));
  const showOrgForm = creatingOrg || orgs.length === 0;
  const selectedOrg = orgId || (orgs.length === 1 ? orgs[0].id : '');

  async function createOrg() {
    if (!orgName.trim() || !managerName.trim() || !orgMd) return setErr('Organization name, your manager name and an organization Markdown file are required.');
    setErr(null);
    try {
      const rec = await cmd.run({ action: 'createOrganization', payload: { name: orgName.trim(), managerName: managerName.trim(), markdownArtifactId: orgMd.id } });
      setOrgId(rec.id);
      setCreatingOrg(false);
      setOrgName(''); setManagerName(''); setOrgMd(null);
      toast({ title: 'Organization created', description: 'You are its hiring manager.' });
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  const qs = questions.map((q) => q.trim()).filter(Boolean);
  const ready = !!selectedOrg && !!title.trim() && !!jd && !!vision && qs.length >= 1 && qs.length <= 3;

  async function create() {
    if (!ready) return;
    setErr(null);
    try {
      const rec = await cmd.run({ action: 'createOpportunity', payload: { organizationId: selectedOrg, title: title.trim(), jdArtifactId: jd!.id, visionArtifactId: vision!.id, questions: qs } });
      toast({ title: 'Draft created', description: 'Review the questions and publish when ready.' });
      setLocation(`/opportunities/${rec.id}`);
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <TestModeBanner />
      <p className="eyebrow text-[var(--muted-ink)]">New opportunity · draft</p>
      <h1 className="mt-3 text-[44px] md:text-[60px]">Say what the job <em>actually is.</em></h1>
      <p className="mt-4 max-w-xl text-[14px] text-[var(--muted-ink)]">This creates a draft only. Nothing is visible to applicants until you approve the questions and publish.</p>

      <ol className="mt-12 space-y-10">
        <Step n="01" title="Organization">
          {orgs.length > 0 && !creatingOrg && (
            <div className="flex flex-wrap items-center gap-3">
              <select className="inp max-w-sm" value={selectedOrg} onChange={(e) => setOrgId(e.target.value)} data-testid="select-organization" aria-label="Organization">
                <option value="">Choose an organization</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.data.name}</option>)}
              </select>
              <button type="button" className="pill pill-outline pill-sm" onClick={() => setCreatingOrg(true)} data-testid="button-new-org"><Plus size={12} /> New organization</button>
            </div>
          )}
          {showOrgForm && (
            <div className="sheet space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="field"><span>Organization name</span><input className="inp" value={orgName} onChange={(e) => setOrgName(e.target.value)} data-testid="input-org-name" /></label>
                <label className="field"><span>Your name as hiring manager</span><input className="inp" value={managerName} onChange={(e) => setManagerName(e.target.value)} data-testid="input-manager-name" /></label>
              </div>
              <TextFileUpload id="org-md" label="Organization context (Markdown)" hint="Who you are, how you work, what matters. Shown to applicants as plain text." uploaded={orgMd} onUploaded={(u) => setOrgMd({ id: u.id, name: u.data.name })} />
              <div className="flex gap-2">
                <button type="button" className="pill pill-dark" onClick={createOrg} disabled={!!cmd.pendingAction} data-testid="button-create-org">{cmd.pendingAction === 'createOrganization' ? 'Creating...' : 'Create organization'}</button>
                {orgs.length > 0 && <button type="button" className="pill pill-ghost" onClick={() => setCreatingOrg(false)}>Cancel</button>}
              </div>
            </div>
          )}
        </Step>

        <Step n="02" title="Title and job description">
          <label className="field"><span>Role title</span><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-title" /></label>
          <div className="sheet mt-4 p-4"><TextFileUpload id="jd-md" label="Job description (Markdown)" uploaded={jd} onUploaded={(u) => setJd({ id: u.id, name: u.data.name })} /></div>
        </Step>

        <Step n="03" title="Your vision, by voice">
          <p className="mb-3 text-[13px] text-[var(--muted-ink)]">Up to three minutes on why this role exists and what good looks like. Automatic transcription is not enabled yet; the recording itself is what applicants hear.</p>
          {vision ? (
            <div className="space-y-3">
              <AudioPlayer artifactId={vision.id} label="Your vision" />
              <button type="button" className="pill pill-outline pill-sm" onClick={() => setVision(null)} data-testid="button-rerecord-vision">Record a different vision</button>
            </div>
          ) : (
            <AudioCapture id="vision" cta="Use as vision" onUploaded={(u) => setVision({ id: u.id, name: u.data.name })} />
          )}
        </Step>

        <Step n="04" title="Questions for applicants (1 to 3)">
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="serif mt-2 text-[20px] text-[#8b9c7e]">{i + 1}</span>
                <textarea className="inp !min-h-[70px]" value={q} placeholder="Ask something a voice answer can actually show." onChange={(e) => setQuestions((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} data-testid={`input-question-${i}`} aria-label={`Question ${i + 1}`} />
                {questions.length > 1 && <button type="button" className="mt-2 p-1" aria-label={`Remove question ${i + 1}`} onClick={() => setQuestions((arr) => arr.filter((_, j) => j !== i))}><X size={16} /></button>}
              </div>
            ))}
            {questions.length < 3 && <button type="button" className="pill pill-outline pill-sm" onClick={() => setQuestions((a) => [...a, ''])} data-testid="button-add-question"><Plus size={12} /> Add question</button>}
          </div>
        </Step>

        <Step n="05" title="Scoring">
          <p className="text-[13px] text-[var(--muted-ink)]">Scoring is not configured. No weights or criteria have been approved, so applications are reviewed by you without numerical scores.</p>
        </Step>
      </ol>

      {err && <p role="alert" className="mt-8 rounded-md border border-[#d9ac99] bg-[#fff4ec] p-3 text-[13px]">{err}</p>}
      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-6">
        <button type="button" className="pill pill-dark" disabled={!ready || !!cmd.pendingAction} onClick={create} data-testid="button-create-opportunity">{cmd.pendingAction === 'createOpportunity' ? 'Creating draft...' : 'Create draft'}</button>
        {!ready && <span className="text-[12px] text-[var(--muted-ink)]">Needs an organization, title, job description, vision recording and at least one question.</span>}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="grid gap-3 md:grid-cols-[48px_1fr]">
      <span className="serif text-[27px] italic leading-none text-[#a8aea1]">{n}</span>
      <div>
        <h2 className="mb-4 text-[26px] tracking-[-1px]">{title}</h2>
        {children}
      </div>
    </li>
  );
}
