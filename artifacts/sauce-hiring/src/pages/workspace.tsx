import { Link } from 'wouter';
import { ArrowRight, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConflictBanner, Empty, ErrorState, PageSkeleton, SectionTitle, TestModeBanner } from '@/components/kit';
import {
  PROCESSING_LABEL,
  as,
  errorMessage,
  fmtDuration,
  isProcessing,
  useHiringCommand,
  useWorkspace,
  type Applicant,
  type HiringManager,
  type Opportunity,
  type Organization,
  type Upload,
} from '@/lib/hiring';
import { getGetRecordingDeletionRequestsQueryKey, useGetRecordingDeletionRequests, useRequestRecordingDeletion } from '@workspace/api-client-react';

export default function WorkspacePage() {
  const ws = useWorkspace();
  const cmd = useHiringCommand();
  const deletionQuery = useGetRecordingDeletionRequests({ query: { queryKey: getGetRecordingDeletionRequestsQueryKey(), refetchInterval: 4000 } });
  const deleteMutation = useRequestRecordingDeletion();
  const deletionRequests = deletionQuery.data?.requests ?? [];
  const { toast } = useToast();

  if (ws.isLoading) return <PageSkeleton />;
  if (ws.isError || !ws.data) return <ErrorState message={errorMessage(ws.error)} onRetry={() => ws.refetch()} />;

  const w = ws.data;
  const orgs = w.organizations.map((o) => as<Organization>(o));
  const managers = w.hiringManagers.map((m) => as<HiringManager>(m));
  const applicant = w.applicant ? as<Applicant>(w.applicant) : null;
  const opps = w.opportunities.map((o) => as<Opportunity>(o));
  const mine = opps.filter((o) => o.data.managerUserId === w.userId);
  const open = opps.filter((o) => o.data.managerUserId !== w.userId && o.data.status === 'published');
  const uploads = w.uploads.map((u) => as<Upload>(u));

  async function retry(id: string, revision: number) {
    try {
      await cmd.run({ action: 'retryTranscription', targetId: id, expectedRevision: revision, payload: {} });
      toast({ title: 'Retry requested', description: 'The provider may still be unavailable.' });
    } catch (e) {
      toast({ title: 'Retry failed', description: errorMessage(e), variant: 'destructive' });
    }
  }

  async function requestDeletion(id: string) {
    const confirmed = window.confirm(
      'Request deletion of this recording and transcript copies from Sauce? This does not erase ElevenLabs provider logs or backups under its standard retention policy.',
    );
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync({ data: { uploadId: id } });
      await ws.refetch();
      await deletionQuery.refetch();
      toast({ title: 'Deletion request submitted', description: 'Sauce deletion status is shown here. ElevenLabs retention is separate.' });
    } catch (e) {
      toast({ title: 'Deletion request failed', description: errorMessage(e), variant: 'destructive' });
    }
  }

  return (
    <div>
      <TestModeBanner />
      <ConflictBanner message={cmd.conflict} onRefresh={cmd.refresh} onDismiss={cmd.dismiss} />
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-[var(--muted-ink)]">Workspace</p>
          <h1 className="mt-3 text-[46px] md:text-[64px]">Your <em>evidence</em> desk.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/opportunities/new" className="pill pill-dark" data-testid="button-new-opportunity"><Plus size={13} /> New opportunity</Link>
          <Link href="/profile" className="pill pill-outline" data-testid="button-profile">{applicant ? 'Edit applicant profile' : 'Create applicant profile'}</Link>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-12">
          <section>
            <SectionTitle eyebrow="As a manager" title="Opportunities you own" />
            {mine.length === 0 ? (
              <Empty title="Nothing drafted yet" action={<Link href="/opportunities/new" className="pill pill-dark pill-sm">Draft an opportunity</Link>}>
                Start with organization context and a job description in Markdown, then record your vision.
              </Empty>
            ) : (
              <ul className="sheet divide-y divide-[var(--line)]">
                {mine.map((o) => (
                  <OppRow key={o.id} id={o.id} o={o.data} meta={o.data.status === 'draft' ? 'Draft · awaiting your approval' : `${o.data.applications.filter((a) => a.status !== 'draft').length} submitted application(s) visible`} />
                ))}
              </ul>
            )}
          </section>
          <section>
            <SectionTitle eyebrow="As an applicant" title="Open opportunities" />
            {open.length === 0 ? (
              <Empty title="No published opportunities from others">When a manager publishes a role, it appears here.</Empty>
            ) : (
              <ul className="sheet divide-y divide-[var(--line)]">
                {open.map((o) => {
                  const app = o.data.applications.find((a) => a.applicantId === w.userId);
                  return <OppRow key={o.id} id={o.id} o={o.data} meta={app ? `Your application: ${app.status}` : 'Not started'} />;
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-10">
          <section className="sheet-mint p-6">
            <p className="eyebrow">Applicant profile</p>
            {applicant ? (
              <>
                <p className="serif mt-3 text-[28px] tracking-tight" data-testid="text-applicant-name">{applicant.data.name}</p>
                <p className="mt-1 text-[12px] text-[#4f5f48]">{applicant.data.contactInformation?.email}</p>
                <Link href="/profile" className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold">Edit profile <ArrowRight size={12} /></Link>
              </>
            ) : (
              <>
                <p className="mt-3 text-[13px] text-[#4f5f48]">You need a profile before applying or asking a manager a question.</p>
                <Link href="/profile" className="pill pill-dark pill-sm mt-4">Create profile</Link>
              </>
            )}
          </section>
          <section>
            <p className="eyebrow mb-3 text-[var(--muted-ink)]">Organizations</p>
            {orgs.length === 0 ? (
              <p className="text-[13px] text-[var(--muted-ink)]">None yet. You can create one while drafting an opportunity.</p>
            ) : (
              <ul className="space-y-3">
                {orgs.map((o) => (
                  <li key={o.id} className="sheet p-4">
                    <p className="serif text-[20px]">{o.data.name}</p>
                    <p className="text-[11px] text-[var(--muted-ink)]">Managers: {managers.filter((m) => m.data.organizationId === o.id).map((m) => m.data.name).join(', ') || 'none'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <p className="eyebrow mb-3 text-[var(--muted-ink)]">Your uploads</p>
            {uploads.length === 0 ? (
              <p className="text-[13px] text-[var(--muted-ink)]">No files yet.</p>
            ) : (
              <ul className="sheet max-h-[420px] divide-y divide-[var(--line)] overflow-auto">
                {uploads.map((u) => (
                  <li key={u.id} className="p-3 text-[12px]" data-testid={`row-upload-${u.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{u.data.name}</span>
                      <span className={`chip ${u.data.status === 'failed' ? 'chip-orange' : u.data.status === 'ready' ? 'chip-mint' : ''}`}>{u.data.status}</span>
                    </div>
                    {u.data.kind === 'audio' && (
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted-ink)]">
                        <span>{fmtDuration(u.data.durationSeconds)} {PROCESSING_LABEL[u.data.processingState] ?? u.data.processingState}{isProcessing(u.data) && '...'}</span>
                        <div className="flex items-center gap-3">
                          {(u.data.processingState === 'failed' || u.data.processingState === 'unavailable') && (
                            <button type="button" className="inline-flex items-center gap-1 font-bold text-[var(--ink)] disabled:opacity-40" disabled={!!cmd.pendingAction} onClick={() => retry(u.id, u.revision)} data-testid={`button-retry-transcription-${u.id}`}><RotateCcw size={11} /> Retry</button>
                          )}
                          {u.data.deletedAt ? <span className="font-semibold">Deleted from Sauce</span> : (
                            <button type="button" className="inline-flex items-center gap-1 font-bold text-[var(--orange)] disabled:opacity-40" disabled={deleteMutation.isPending} onClick={() => requestDeletion(u.id)} data-testid={`button-delete-recording-${u.id}`}><Trash2 size={11} /> Request deletion</button>
                          )}
                        </div>
                      </div>
                    )}
                    {u.data.kind === 'audio' && <p className="mt-1 text-[10px] text-[var(--muted-ink)]">
                      {deletionRequests.find((r) => r.uploadId === u.id)?.state === 'completed'
                        ? 'Sauce deleted the recording and stored transcript copies. ElevenLabs provider logs or backups may remain under its standard retention.'
                        : deletionRequests.find((r) => r.uploadId === u.id)?.state === 'retrying'
                          ? 'Deletion is waiting for storage recovery. Sauce will retry automatically.'
                          : deletionRequests.find((r) => r.uploadId === u.id)?.state === 'processing'
                            ? 'Sauce is deleting this recording and its transcript copies…'
                            : deletionRequests.find((r) => r.uploadId === u.id)?.state === 'requested'
                              ? 'Deletion request received. Sauce will remove the recording and transcript copies; provider retention is separate.'
                              : null}
                    </p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function OppRow({ id, o, meta }: { id: string; o: Opportunity; meta: string }) {
  return (
    <li>
      <Link href={`/opportunities/${id}`} className="group flex items-center gap-4 p-5 hover:bg-[#f7f4ea]" data-testid={`link-opportunity-${id}`}>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[var(--muted-ink)]">{o.organizationName}</p>
          <p className="serif mt-1 truncate text-[24px] tracking-tight">{o.title}</p>
          <p className="mt-1 text-[12px] text-[var(--muted-ink)]">{meta}</p>
        </div>
        <span className={`chip ${o.status === 'published' ? 'chip-mint' : 'chip-orange'}`}>{o.status}</span>
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </li>
  );
}

