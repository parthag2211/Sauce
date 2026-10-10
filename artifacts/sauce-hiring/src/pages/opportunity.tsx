import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Check, MessageSquare, RotateCcw, Send } from 'lucide-react';
import { getGetHiringOpportunityQueryKey, useGetHiringOpportunity } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { AudioPlayer, ConflictBanner, Empty, ErrorState, PageSkeleton, SectionTitle, TestModeBanner, TextBlock } from '@/components/kit';
import { AudioCapture } from '@/components/uploaders';
import {
  PROCESSING_LABEL,
  as,
  errorMessage,
  errorStatus,
  fmtDate,
  fmtDuration,
  isProcessing,
  useHiringCommand,
  useWorkspace,
  type Applicant,
  type Application,
  type Assessment,
  type CommandInput,
  type OutcomeStatus,
  type Opportunity,
  type Question,
  type Rec,
  type Upload,
  type VoiceAnswer,
} from '@/lib/hiring';

type Cmd = ReturnType<typeof useHiringCommand>;
type Ctx = { opp: Rec<Opportunity>; cmd: Cmd; exec: (c: Omit<CommandInput, 'targetId' | 'expectedRevision'>, ok?: string) => Promise<boolean> };

export default function OpportunityPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? '';
  const ws = useWorkspace();
  const q = useGetHiringOpportunity(id, { query: { enabled: !!id, queryKey: getGetHiringOpportunityQueryKey(id), refetchInterval: 10000 } });
  const cmd = useHiringCommand();
  const { toast } = useToast();

  if (q.isLoading || ws.isLoading) return <PageSkeleton />;
  if (q.isError || !q.data) {
    const s = errorStatus(q.error);
    return <ErrorState title={s === 404 ? 'Opportunity not found' : s === 403 ? 'Not visible to you' : 'Could not load opportunity'} message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  }
  if (ws.isError || !ws.data) return <ErrorState message={errorMessage(ws.error)} onRetry={() => ws.refetch()} />;

  const opp = as<Opportunity>(q.data);
  const d = opp.data;
  const userId = ws.data.userId;
  const isManager = d.managerUserId === userId;
  const applicant = ws.data.applicant ? as<Applicant>(ws.data.applicant) : null;
  const uploads = new Map(ws.data.uploads.map((u) => [u.id, as<Upload>(u)]));
  const myApp = d.applications.find((a) => a.applicantId === userId);

  const exec: Ctx['exec'] = async (c, ok) => {
    try {
      await cmd.run({ ...c, targetId: opp.id, expectedRevision: opp.revision });
      if (ok) toast({ title: ok });
      return true;
    } catch (e) {
      if (errorStatus(e) !== 409) toast({ title: 'Action failed', description: errorMessage(e), variant: 'destructive' });
      return false;
    }
  };
  const ctx: Ctx = { opp, cmd, exec };

  return (
    <div>
      <TestModeBanner />
      <ConflictBanner message={cmd.conflict} onRefresh={cmd.refresh} onDismiss={cmd.dismiss} />
      <Link href="/workspace" className="mb-6 inline-flex items-center gap-2 text-[12px] font-bold" data-testid="link-back"><ArrowLeft size={13} /> Workspace</Link>

      <header className="mb-10 border-b border-[var(--line)] pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow text-[var(--muted-ink)]">{d.organizationName}</span>
          <span className={`chip ${d.status === 'published' ? 'chip-mint' : 'chip-orange'}`} data-testid="status-opportunity">{d.status}</span>
          {isManager && <span className="chip chip-blue">You manage this</span>}
        </div>
        <h1 className="mt-4 text-[44px] md:text-[68px]" data-testid="text-opportunity-title">{d.title}</h1>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-14">
          <section>
            <SectionTitle eyebrow="Manager vision" title={<>In the manager's <em>own words</em></>} />
            <AudioPlayer artifactId={d.managerVision.artifactId} label="Play vision" />
            <p className="mt-2 text-[11px] text-[var(--muted-ink)]">No automatic transcript: transcription provider not yet enabled.</p>
          </section>

          {isManager && d.status === 'draft' && <PublishPanel ctx={ctx} />}

          {!isManager && d.status === 'published' && (
            <ApplicantPanel ctx={ctx} app={myApp} hasProfile={!!applicant} uploads={uploads} />
          )}

          {isManager && d.status === 'published' && <ManagerApplications ctx={ctx} uploads={uploads} />}

          {d.status === 'published' && <Inquiries ctx={ctx} isManager={isManager} canAsk={!isManager && !!applicant} />}
        </div>

        <aside className="min-w-0 space-y-8">
          <details className="sheet group p-5" open>
            <summary className="cursor-pointer list-none"><span className="eyebrow">Job description</span></summary>
            <TextBlock text={d.jobDescription} className="mt-4 max-h-[460px] overflow-auto text-[13px]" />
          </details>
          <details className="sheet p-5">
            <summary className="cursor-pointer list-none"><span className="eyebrow">About {d.organizationName}</span></summary>
            <TextBlock text={d.organizationContext} className="mt-4 max-h-[460px] overflow-auto text-[13px]" />
          </details>
          <ScoringNotice />
        </aside>
      </div>
    </div>
  );
}

function ScoringNotice({ assessment }: { assessment?: Assessment }) {
  const labels: Record<string, string> = { composite_profile: 'Composite profile', voice_transcript: 'Voice transcript', voice_behaviors: 'Voice behaviors' };
  const comps = assessment?.components ?? { composite_profile: { score: null, status: 'not_configured' }, voice_transcript: { score: null, status: 'not_configured' }, voice_behaviors: { score: null, status: 'not_configured' } };
  return (
    <div className="rounded-[10px] border border-dashed border-[#9eb0a0] bg-[#eef1e8] p-5" data-testid="panel-scoring">
      <p className="eyebrow">Scoring · not configured</p>
      <p className="mt-2 text-[12px] leading-relaxed text-[#4f5f48]">No weights or criteria have been approved, so Sauce produces no scores. Decisions are made by the manager reading and listening to the evidence.</p>
      <ul className="mt-3 space-y-1 text-[12px]">
        {Object.entries(comps).map(([k, v]) => (
          <li key={k} className="flex justify-between border-t border-[#d3dccb] pt-1"><span>{labels[k] ?? k}</span><span className="text-[var(--muted-ink)]">{v.score ?? 'No score'} · {v.status.replace('_', ' ')}</span></li>
        ))}
      </ul>
      {!!assessment?.gaps?.length && <p className="mt-3 text-[11px] text-[var(--muted-ink)]">Gaps: {assessment.gaps.join('; ')}</p>}
    </div>
  );
}

function PublishPanel({ ctx }: { ctx: Ctx }) {
  const [approved, setApproved] = useState(false);
  const qs = ctx.opp.data.questions.forApplicants;
  return (
    <section className="sheet offset p-6">
      <SectionTitle eyebrow="Draft · your approval needed" title="Approve these questions" />
      <ol className="space-y-3">
        {qs.map((q, i) => (
          <li key={q.id} className="flex gap-3 border-b border-[var(--line)] pb-3 last:border-0"><span className="serif text-[20px] text-[#8b9c7e]">{i + 1}</span><TextBlock text={q.text} /></li>
        ))}
      </ol>
      <label className="mt-5 flex items-start gap-3 text-[13px]">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--ink)]" checked={approved} onChange={(e) => setApproved(e.target.checked)} data-testid="checkbox-approve-questions" />
        I have read these questions and approve them exactly as shown. Publishing makes this opportunity visible to applicants.
      </label>
      <button type="button" className="pill pill-orange mt-5" disabled={!approved || !!ctx.cmd.pendingAction} onClick={() => ctx.exec({ action: 'publishOpportunity', payload: {} }, 'Published')} data-testid="button-publish">
        {ctx.cmd.pendingAction === 'publishOpportunity' ? 'Publishing...' : 'Approve and publish'}
      </button>
    </section>
  );
}

function ApplicantPanel({ ctx, app, hasProfile, uploads }: { ctx: Ctx; app?: Application; hasProfile: boolean; uploads: Map<string, Rec<Upload>> }) {
  const questions = ctx.opp.data.questions.forApplicants;
  if (!app) {
    return (
      <section className="sheet-mint p-6">
        <SectionTitle eyebrow="Apply by voice" title="Ready when you are" />
        <p className="text-[13px] text-[#4f5f48]">You will record an answer to each of {questions.length} question{questions.length === 1 ? '' : 's'}. Retake freely; you choose the take and confirm its transcript.</p>
        {hasProfile ? (
          <button type="button" className="pill pill-dark mt-5" disabled={!!ctx.cmd.pendingAction} onClick={() => ctx.exec({ action: 'startApplication', payload: {} }, 'Application started')} data-testid="button-start-application">
            {ctx.cmd.pendingAction === 'startApplication' ? 'Starting...' : 'Start application'}
          </button>
        ) : (
          <Link href="/profile" className="pill pill-dark mt-5" data-testid="link-create-profile">Create your profile first</Link>
        )}
      </section>
    );
  }
  if (app.status !== 'draft') return <SubmittedView app={app} questions={app.submittedQuestions ?? questions} />;

  const readyFor = (q: Question) => app.voiceAnswers.some((t) => t.questionId === q.id && t.selected && (t.reviewedTranscript ?? '').trim());
  const allReady = questions.every(readyFor);

  return (
    <section>
      <SectionTitle eyebrow="Your application · draft" title={<>Answer <em>out loud</em></>} />
      <div className="mb-6 rounded-md border border-[#b6c2df] bg-[#e7ecf6] p-4 text-[12px] leading-relaxed text-[#2f4170]">
        Automatic transcription is not enabled until provider consent is configured, so it will usually show as unavailable. Your recording is stored as a real file. Listen back and type what you said: that becomes your manually reviewed transcript, labeled as such. Nothing is ever filled in for you.
      </div>
      <div className="space-y-10">
        {questions.map((q, i) => (
          <QuestionBlock key={q.id} ctx={ctx} q={q} index={i} takes={app.voiceAnswers.filter((t) => t.questionId === q.id)} uploads={uploads} ready={readyFor(q)} />
        ))}
      </div>
      <div className="mt-10 rounded-[10px] border border-[var(--ink)] p-6">
        <p className="eyebrow">Submit</p>
        <p className="mt-2 text-[13px] text-[var(--muted-ink)]">Submitting pins your current profile, the selected take for each question, and its transcripts. You cannot edit afterwards.</p>
        <ul className="mt-3 space-y-1 text-[12px]">
          {questions.map((q, i) => <li key={q.id} className="flex items-center gap-2">{readyFor(q) ? <Check size={13} className="text-[#3e5634]" /> : <span className="h-3 w-3 rounded-full border border-[#a9b0a5]" />} Question {i + 1}: {readyFor(q) ? 'reviewed take selected' : 'needs a reviewed, selected take'}</li>)}
        </ul>
        <SubmitButton ctx={ctx} disabled={!allReady} />
      </div>
    </section>
  );
}

function SubmitButton({ ctx, disabled }: { ctx: Ctx; disabled: boolean }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <button type="button" className="pill pill-orange mt-5" disabled={disabled || !!ctx.cmd.pendingAction} onClick={() => setConfirm(true)} data-testid="button-submit-application">Submit application</button>;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <span className="text-[13px] font-semibold">Submit now? This cannot be undone.</span>
      <button type="button" className="pill pill-orange" disabled={!!ctx.cmd.pendingAction} onClick={async () => { await ctx.exec({ action: 'submitApplication', payload: {} }, 'Application submitted'); setConfirm(false); }} data-testid="button-confirm-submit">{ctx.cmd.pendingAction === 'submitApplication' ? 'Submitting...' : 'Yes, submit'}</button>
      <button type="button" className="pill pill-ghost" onClick={() => setConfirm(false)}>Not yet</button>
    </div>
  );
}

function QuestionBlock({ ctx, q, index, takes, uploads, ready }: { ctx: Ctx; q: Question; index: number; takes: VoiceAnswer[]; uploads: Map<string, Rec<Upload>>; ready: boolean }) {
  return (
    <div className="border-t border-[var(--line)] pt-6" data-testid={`block-question-${q.id}`}>
      <div className="flex items-start gap-4">
        <span className="serif text-[30px] italic leading-none text-[#a8aea1]">{String(index + 1).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <TextBlock text={q.text} className="serif !text-[22px] leading-snug tracking-[-.5px]" />
          {ready && <span className="chip chip-mint mt-2"><Check size={11} /> Ready</span>}
        </div>
      </div>
      <div className="mt-5 space-y-4 md:pl-12">
        {takes.map((t, i) => <TakeCard key={t.id} ctx={ctx} take={t} n={i + 1} upload={uploads.get(t.artifactId)} />)}
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-wide">{takes.length ? `Record take ${takes.length + 1}` : 'Record your answer'}</p>
          <AudioCapture id={`q-${q.id}`} cta="Add this take" onUploaded={async (u) => { await ctx.exec({ action: 'addTake', payload: { questionId: q.id, artifactId: u.id } }, 'Take added'); }} />
        </div>
      </div>
    </div>
  );
}

function TakeCard({ ctx, take, n, upload }: { ctx: Ctx; take: VoiceAnswer; n: number; upload?: Rec<Upload> }) {
  const [text, setText] = useState(take.reviewedTranscript ?? '');
  const u = upload?.data;
  const dirty = text.trim() !== (take.reviewedTranscript ?? '').trim();
  const canRetry = u && (u.processingState === 'failed' || u.processingState === 'unavailable');
  return (
    <div className={`rounded-lg border p-4 ${take.selected ? 'border-[var(--ink)] bg-[#fffdf7]' : 'border-[var(--line)] bg-[#faf8f1]'}`} data-testid={`card-take-${take.id}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-bold">Take {n}</span>
        {take.selected && <span className="chip chip-orange">Selected</span>}
        {u && <span className="text-[11px] text-[var(--muted-ink)]">{fmtDuration(u.durationSeconds)}</span>}
        {take.reviewedAt && <span className="ml-auto text-[11px] text-[var(--muted-ink)]">Reviewed {fmtDate(take.reviewedAt)}</span>}
      </div>
      <AudioPlayer artifactId={take.artifactId} label={`Take ${n}`} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-[#f2f0e6] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#687b59]">Original automatic transcript</p>
          {u?.originalAsr ? (
            <TextBlock text={u.originalAsr} className="mt-2 !text-[13px]" />
          ) : (
            <p className="mt-2 text-[12px] text-[var(--muted-ink)]">{u ? `${PROCESSING_LABEL[u.processingState] ?? u.processingState}${isProcessing(u) ? '...' : '.'}` : 'Status loading.'} {u?.errorCode && `(${u.errorCode})`}</p>
          )}
          {canRetry && upload && (
            <button type="button" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold disabled:opacity-40" disabled={!!ctx.cmd.pendingAction} onClick={async () => { try { await ctx.cmd.run({ action: 'retryTranscription', targetId: upload.id, expectedRevision: upload.revision, payload: {} }); } catch { /* conflict banner / status shows */ } }} data-testid={`button-retry-asr-${take.id}`}>
              <RotateCcw size={11} /> Retry transcription
            </button>
          )}
        </div>
        <label className="field">
          <span className="!text-[10px] uppercase tracking-[.08em]">Reviewed transcript · manual</span>
          <textarea className="inp !min-h-[90px] !text-[13px]" value={text} onChange={(e) => setText(e.target.value)} placeholder={u?.originalAsr ? 'Correct the automatic transcript.' : 'Listen, then type what you said.'} data-testid={`input-review-${take.id}`} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="pill pill-dark pill-sm" disabled={!text.trim() || !!ctx.cmd.pendingAction || (!dirty && take.selected)} onClick={() => ctx.exec({ action: 'reviewTake', payload: { takeId: take.id, reviewedTranscript: text.trim() } }, 'Review saved, take selected')} data-testid={`button-review-${take.id}`}>
          {take.selected && !dirty ? 'Saved and selected' : 'Save review and select this take'}
        </button>
        {!take.selected && <span className="text-[11px] text-[var(--muted-ink)]">Selecting unselects your other takes for this question.</span>}
      </div>
    </div>
  );
}

function SubmittedView({ app, questions }: { app: Application; questions: Question[] }) {
  return (
    <section>
      <SectionTitle eyebrow="Your application" title={<>Submitted, <em>as sent</em></>}><span className="chip chip-mint" data-testid="status-application">{app.status}</span></SectionTitle>
      <p className="mb-6 text-[13px] text-[var(--muted-ink)]">Submitted {fmtDate(app.submittedAt)}. This evidence is pinned and can no longer be edited.</p>
      <AnswersView app={app} questions={questions} />
      <OutcomeHistory app={app} />
    </section>
  );
}

function AnswersView({ app, questions }: { app: Application; questions: Question[] }) {
  const answers = app.submittedAnswers ?? [];
  if (!answers.length) return <Empty title="No pinned answers on record" />;
  return (
    <div className="space-y-5">
      {answers.map((a, i) => {
        const q = questions.find((x) => x.id === a.questionId);
        return (
          <div key={a.takeId ?? a.artifactId ?? i} className="rounded-lg border border-[var(--line)] bg-[#fffdf7] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--muted-ink)]">Question {i + 1}</p>
            <TextBlock text={q?.text ?? ''} className="serif mt-1 !text-[19px]" />
            {a.artifactId && <div className="mt-3"><AudioPlayer artifactId={a.artifactId} label={`Answer ${i + 1}${a.durationSeconds ? ` · ${fmtDuration(a.durationSeconds)}` : ''}`} /></div>}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-[#f2f0e6] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#687b59]">Original automatic transcript</p>
                {a.originalAsr ? <TextBlock text={a.originalAsr} className="mt-2 !text-[13px]" /> : <p className="mt-2 text-[12px] text-[var(--muted-ink)]">None. {a.processingState ? `Status: ${a.processingState.replace('_', ' ')}.` : 'Automatic transcription was not available.'}</p>}
              </div>
              <div className="rounded-md bg-[var(--mint)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#3e5634]">Reviewed transcript · {a.originalAsr ? 'corrected by applicant' : 'typed manually by applicant'}</p>
                <TextBlock text={a.reviewedTranscript ?? ''} className="mt-2 !text-[13px]" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OutcomeHistory({ app }: { app: Application }) {
  return (
    <div className="mt-8">
      <p className="eyebrow mb-3 text-[var(--muted-ink)]">Outcome history</p>
      {app.outcomeHistory.length === 0 ? (
        <p className="text-[13px] text-[var(--muted-ink)]">No outcome recorded yet.</p>
      ) : (
        <ol className="relative space-y-3 border-l border-[#b9c3af] pl-5">
          {app.outcomeHistory.map((h, i) => (
            <li key={i} className="text-[13px]" data-testid={`row-outcome-${i}`}>
              <span className="absolute -left-[4px] mt-1.5 h-2 w-2 rounded-full bg-[var(--orange)]" />
              <b className="capitalize">{String(h.status ?? h.to ?? 'updated')}</b>
              {h.from && <span className="text-[var(--muted-ink)]"> from {String(h.from)}</span>}
              <span className="ml-2 text-[11px] text-[var(--muted-ink)]">{fmtDate((h.at ?? h.createdAt) as string | undefined)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const OUTCOMES: OutcomeStatus[] = ['shortlisted', 'offered', 'accepted', 'hired'];

function ManagerApplications({ ctx, uploads: _uploads }: { ctx: Ctx; uploads: Map<string, Rec<Upload>> }) {
  void _uploads;
  const apps = ctx.opp.data.applications.filter((a) => a.status !== 'draft');
  const [openId, setOpenId] = useState<string | null>(apps[0]?.id ?? null);
  return (
    <section>
      <SectionTitle eyebrow="Submitted applications" title={<>Listen, read, <em>decide</em></>} />
      {apps.length === 0 ? (
        <Empty title="No submitted applications yet">Drafts are private to applicants. You will see an application only once it is submitted.</Empty>
      ) : (
        <div className="space-y-4">
          {apps.map((a) => {
            const p = a.submittedProfile;
            const open = openId === a.id;
            return (
              <div key={a.id} className="sheet overflow-hidden" data-testid={`card-application-${a.id}`}>
                <button type="button" className="flex w-full items-center gap-4 p-5 text-left hover:bg-[#f7f4ea]" aria-expanded={open} onClick={() => setOpenId(open ? null : a.id)}>
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-[#a7b49d] bg-[#f8f2dc] serif text-[17px]">{(p?.name ?? '?').slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="serif block truncate text-[22px]">{p?.name ?? 'Applicant'}</span>
                    <span className="text-[11px] text-[var(--muted-ink)]">Submitted {fmtDate(a.submittedAt)}</span>
                  </span>
                  <span className="chip chip-blue capitalize">{a.status}</span>
                </button>
                {open && (
                  <div className="space-y-8 border-t border-[var(--line)] p-5">
                    {p && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <div><p className="eyebrow mb-1 text-[var(--muted-ink)]">Credentials</p><TextBlock text={p.credentials} className="!text-[13px]" /></div>
                        <div><p className="eyebrow mb-1 text-[var(--muted-ink)]">Work proposal</p><TextBlock text={p.workProposal} className="!text-[13px]" /></div>
                        <div><p className="eyebrow mb-1 text-[var(--muted-ink)]">Contact</p><p className="text-[13px]">{p.contactInformation?.email}<br />{p.contactInformation?.phone}<br />{p.contactInformation?.linkedin}</p></div>
                        {p.references && <div><p className="eyebrow mb-1 text-[var(--muted-ink)]">References</p><TextBlock text={p.references} className="!text-[13px]" /></div>}
                      </div>
                    )}
                    <AnswersView app={a} questions={a.submittedQuestions ?? ctx.opp.data.questions.forApplicants} />
                    <ScoringNotice assessment={a.assessment} />
                    <OutcomeControl ctx={ctx} app={a} />
                    <OutcomeHistory app={a} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function OutcomeControl({ ctx, app }: { ctx: Ctx; app: Application }) {
  const [pick, setPick] = useState<OutcomeStatus | ''>('');
  return (
    <div className="rounded-lg border border-[var(--ink)] p-4">
      <p className="eyebrow">Record a decision</p>
      <p className="mt-1 text-[12px] text-[var(--muted-ink)]">Your call, recorded with a timestamp in the outcome history.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Outcome">
        {OUTCOMES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={pick === s} disabled={app.status === s} onClick={() => setPick(s)} className={`pill pill-sm capitalize ${pick === s ? 'pill-dark' : 'pill-outline'}`} data-testid={`button-outcome-${s}-${app.id}`}>{s}</button>
        ))}
      </div>
      {pick && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[13px]">Mark as <b>{pick}</b>?</span>
          <button type="button" className="pill pill-orange pill-sm" disabled={!!ctx.cmd.pendingAction} onClick={async () => { if (await ctx.exec({ action: 'setOutcome', payload: { applicationId: app.id, status: pick } }, `Marked ${pick}`)) setPick(''); }} data-testid={`button-confirm-outcome-${app.id}`}>Confirm</button>
          <button type="button" className="pill pill-ghost pill-sm" onClick={() => setPick('')}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function Inquiries({ ctx, isManager, canAsk }: { ctx: Ctx; isManager: boolean; canAsk: boolean }) {
  const list = ctx.opp.data.questions.fromApplicants;
  const [text, setText] = useState('');
  return (
    <section>
      <SectionTitle eyebrow="Inquiries" title={<>Questions <em>about</em> the role</>} />
      <p className="mb-5 text-[12px] text-[var(--muted-ink)]">Asking is independent from screening. It does not affect an application.</p>
      {list.length === 0 ? (
        <Empty title="No inquiries yet">{canAsk ? 'Ask the manager anything about the role.' : isManager ? 'Applicant questions will appear here for you to answer.' : 'Create a profile to ask a question.'}</Empty>
      ) : (
        <ul className="space-y-4">
          {list.map((iq) => <InquiryItem key={iq.id} ctx={ctx} iq={iq} isManager={isManager} />)}
        </ul>
      )}
      {canAsk && (
        <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={async (e) => { e.preventDefault(); if (text.trim() && (await ctx.exec({ action: 'askInquiry', payload: { text: text.trim() } }, 'Question sent'))) setText(''); }}>
          <label className="field flex-1"><span>Ask the manager</span><textarea className="inp !min-h-[70px]" value={text} onChange={(e) => setText(e.target.value)} data-testid="input-inquiry" /></label>
          <button type="submit" className="pill pill-dark" disabled={!text.trim() || !!ctx.cmd.pendingAction} data-testid="button-ask"><Send size={13} /> Send</button>
        </form>
      )}
      {!isManager && !canAsk && <Link href="/profile" className="mt-4 inline-block text-[12px] font-bold underline">Create a profile to ask</Link>}
    </section>
  );
}

function InquiryItem({ ctx, iq, isManager }: { ctx: Ctx; iq: Opportunity['questions']['fromApplicants'][number]; isManager: boolean }) {
  const [reply, setReply] = useState('');
  return (
    <li className="sheet p-4" data-testid={`card-inquiry-${iq.id}`}>
      <div className="flex items-start gap-3">
        <MessageSquare size={15} className="mt-1 shrink-0 text-[var(--orange)]" />
        <div className="min-w-0 flex-1">
          <TextBlock text={iq.text} />
          <p className="mt-1 text-[11px] text-[var(--muted-ink)]">{fmtDate(iq.createdAt)}</p>
        </div>
      </div>
      {iq.reply ? (
        <div className="ml-7 mt-3 rounded-md bg-[var(--mint)] p-3"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#3e5634]">Manager reply</p><TextBlock text={iq.reply} className="mt-1 !text-[13px]" /></div>
      ) : isManager ? (
        <form className="ml-7 mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={async (e) => { e.preventDefault(); if (reply.trim() && (await ctx.exec({ action: 'replyInquiry', payload: { inquiryId: iq.id, text: reply.trim() } }, 'Reply posted'))) setReply(''); }}>
          <input className="inp" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply" aria-label="Reply" data-testid={`input-reply-${iq.id}`} />
          <button type="submit" className="pill pill-dark pill-sm" disabled={!reply.trim() || !!ctx.cmd.pendingAction} data-testid={`button-reply-${iq.id}`}>Reply</button>
        </form>
      ) : (
        <p className="ml-7 mt-2 text-[11px] text-[var(--muted-ink)]">Awaiting reply.</p>
      )}
    </li>
  );
}
