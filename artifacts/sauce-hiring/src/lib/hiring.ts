import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetHiringWorkspaceQueryKey,
  useFinalizeHiringUpload,
  useGetHiringWorkspace,
  useRequestHiringUpload,
  useRunHiringCommand,
  type HiringCommand,
  type HiringRecord,
  type HiringWorkspace,
} from '@workspace/api-client-react';

/* ---------- View types (frontend-only mirrors of server data) ---------- */

export type Rec<T> = { id: string; revision: number; data: T };

export type Organization = {
  name: string;
  markdownArtifactId: string;
  organizationMarkdown: string;
  hiringManagerIds: string[];
};
export type HiringManager = { name: string; organizationId: string };
export type Contact = { email: string; phone: string; linkedin: string };
export type Applicant = {
  name: string;
  credentials: string;
  workProposal: string;
  contactInformation: Contact;
  references: string;
  credentialArtifactId?: string;
  proposalArtifactId?: string;
};
export type Question = { id: string; text: string };
export type Inquiry = {
  id: string;
  applicantId: string;
  text: string;
  reply: string | null;
  createdAt: string;
};
export type VoiceAnswer = {
  id: string;
  questionId: string;
  artifactId: string;
  reviewedTranscript: string | null;
  reviewedAt: string | null;
  selected: boolean;
};
export type OutcomeStatus = 'shortlisted' | 'offered' | 'accepted' | 'hired';
export type ApplicationStatus = 'draft' | 'submitted' | OutcomeStatus;
export type OutcomeEntry = {
  status?: string;
  from?: string;
  to?: string;
  at?: string;
  createdAt?: string;
  by?: string;
  [k: string]: unknown;
};
export type SubmittedAnswer = {
  questionId?: string;
  takeId?: string;
  artifactId?: string;
  reviewedTranscript?: string | null;
  originalAsr?: string | null;
  durationSeconds?: number | null;
  processingState?: string;
  provider?: string;
  sha256?: string;
  [k: string]: unknown;
};
export type Assessment = {
  status: 'not_configured' | string;
  overallScore: number | null;
  components: Record<string, { score: number | null; status: string }>;
  gaps: string[];
};
export type Application = {
  id: string;
  applicantId: string;
  status: ApplicationStatus;
  voiceAnswers: VoiceAnswer[];
  submittedProfile?: Applicant;
  submittedQuestions?: Question[];
  submittedAnswers?: SubmittedAnswer[];
  assessment?: Assessment;
  outcomeHistory: OutcomeEntry[];
  submittedAt?: string;
};
export type Opportunity = {
  title: string;
  organizationId: string;
  hiringManagerId: string;
  managerUserId: string;
  organizationName: string;
  organizationContext: string;
  jobDescription: string;
  jdArtifactId: string;
  managerVision: { artifactId: string };
  questions: { forApplicants: Question[]; fromApplicants: Inquiry[] };
  scoring: { status: string; weights: unknown; criteria: unknown[] };
  status: 'draft' | 'published';
  applications: Application[];
  history: Record<string, unknown>;
};
export type ProcessingState =
  | 'not_requested'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'unavailable';
export type Upload = {
  name: string;
  kind: 'audio' | 'markdown';
  contentType: string;
  status: 'reserved' | 'ready' | 'failed';
  sha256: string;
  durationSeconds: number | null;
  processingState: ProcessingState;
  originalAsr: string | null;
  words: unknown[];
  errorCode?: string;
  provider?: string;
};

export function as<T>(r: HiringRecord): Rec<T> {
  return r as unknown as Rec<T>;
}

/* ---------- Limits ---------- */
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
export const AUDIO_MAX_SECONDS = 180;
export const TEXT_MAX_BYTES = 256 * 1024;
export const AUDIO_EXT = ['webm', 'ogg', 'mp3', 'wav', 'm4a'];
export const TEXT_EXT = ['md', 'txt'];

export function audioContentType(name: string, fallback: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
  };
  return map[ext] ?? (fallback.split(';')[0] || 'application/octet-stream');
}

/* ---------- Errors ---------- */
type MaybeApiError = { status?: number; data?: unknown; message?: string };

export function errorStatus(e: unknown): number | undefined {
  const s = (e as MaybeApiError)?.status;
  return typeof s === 'number' ? s : undefined;
}

export function errorMessage(e: unknown): string {
  const err = e as MaybeApiError;
  const d = err?.data as Record<string, unknown> | null | undefined;
  if (d && typeof d === 'object') {
    for (const k of ['error', 'message', 'detail', 'title']) {
      if (typeof d[k] === 'string') return d[k] as string;
    }
  }
  if (errorStatus(e) === undefined && e instanceof TypeError)
    return 'Network problem. Your request was not confirmed; retrying is safe.';
  return err?.message || 'Something went wrong.';
}

/* ---------- Workspace ---------- */
export function isProcessing(u: Upload) {
  return (
    u.status === 'reserved' ||
    u.processingState === 'queued' ||
    u.processingState === 'processing'
  );
}

export function useWorkspace() {
  return useGetHiringWorkspace({
    query: {
      queryKey: getGetHiringWorkspaceQueryKey(),
      refetchInterval: (q) => {
        const d = q.state.data as HiringWorkspace | undefined;
        const busy = d?.uploads.some((u) => isProcessing(as<Upload>(u).data));
        return busy ? 3000 : 10000;
      },
    },
  });
}

/* ---------- Commands with idempotency and conflict handling ---------- */
export type CommandInput = Omit<HiringCommand, 'idempotencyKey'>;

export function useHiringCommand() {
  const m = useRunHiringCommand();
  const mutateRef = useRef(m.mutateAsync);
  mutateRef.current = m.mutateAsync;
  const qc = useQueryClient();
  const keys = useRef(new Map<string, string>());
  const [conflict, setConflict] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const run = useCallback(
    async (cmd: CommandInput) => {
      const sig = JSON.stringify(cmd);
      let key = keys.current.get(sig);
      if (!key) {
        key = crypto.randomUUID();
        keys.current.set(sig, key);
      }
      setPendingAction(cmd.action);
      try {
        const result = await mutateRef.current({
          data: { ...cmd, idempotencyKey: key },
        });
        keys.current.delete(sig);
        setConflict(null);
        await qc.invalidateQueries();
        return result;
      } catch (e) {
        // A server answer means the key was consumed or rejected; a network
        // failure keeps the key so an unchanged retry is deduplicated.
        if (errorStatus(e) !== undefined) keys.current.delete(sig);
        if (errorStatus(e) === 409) {
          setConflict(
            'Someone (or another tab) changed this record since you loaded it. Nothing was overwritten. Refresh to see the latest version, then try again.',
          );
        }
        throw e;
      } finally {
        setPendingAction(null);
      }
    },
    [qc],
  );

  const refresh = useCallback(async () => {
    await qc.invalidateQueries();
    setConflict(null);
  }, [qc]);

  return { run, pendingAction, conflict, refresh, dismiss: () => setConflict(null) };
}

/* ---------- Upload flow ---------- */
export type UploadPhase = 'idle' | 'requesting' | 'sending' | 'finalizing' | 'done' | 'error';

export function useHiringUploader() {
  const req = useRequestHiringUpload();
  const fin = useFinalizeHiringUpload();
  const reqRef = useRef(req.mutateAsync);
  reqRef.current = req.mutateAsync;
  const finRef = useRef(fin.mutateAsync);
  finRef.current = fin.mutateAsync;
  const qc = useQueryClient();
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      body: Blob,
      meta: { name: string; kind: 'audio' | 'markdown'; contentType: string },
    ) => {
      setError(null);
      try {
        setPhase('requesting');
        const reserved = await reqRef.current({
          data: {
            name: meta.name.slice(0, 200),
            size: body.size,
            contentType: meta.contentType,
            kind: meta.kind,
            testDataConfirmed: true,
          },
        });
        setPhase('sending');
        const put = await fetch(reserved.uploadUrl, {
          method: 'PUT',
          body,
          headers: { 'Content-Type': meta.contentType },
          credentials: 'omit',
        });
        if (!put.ok) throw new Error(`File transfer failed (${put.status}).`);
        setPhase('finalizing');
        const record = await finRef.current({ id: reserved.id });
        setPhase('done');
        await qc.invalidateQueries({ queryKey: getGetHiringWorkspaceQueryKey() });
        return as<Upload>(record);
      } catch (e) {
        setPhase('error');
        setError(errorMessage(e));
        throw e;
      }
    },
    [qc],
  );

  return { upload, phase, error, reset: () => { setPhase('idle'); setError(null); } };
}

export const PHASE_LABEL: Record<UploadPhase, string> = {
  idle: '',
  requesting: 'Reserving storage',
  sending: 'Sending file',
  finalizing: 'Verifying on server',
  done: 'Stored',
  error: 'Upload failed',
};

export const PROCESSING_LABEL: Record<ProcessingState, string> = {
  not_requested: 'Transcription not requested',
  queued: 'Queued for transcription',
  processing: 'Transcribing',
  completed: 'Automatic transcript ready',
  failed: 'Transcription failed',
  unavailable: 'Automatic transcription unavailable',
};

export function fmtDate(s?: string | null) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function fmtDuration(sec?: number | null) {
  if (sec == null || Number.isNaN(sec)) return '';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
