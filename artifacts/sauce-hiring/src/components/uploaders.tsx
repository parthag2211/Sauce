import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Mic, Square, Trash2, Upload as UploadIcon } from 'lucide-react';
import {
  AUDIO_EXT,
  AUDIO_MAX_BYTES,
  AUDIO_MAX_SECONDS,
  PHASE_LABEL,
  TEXT_EXT,
  TEXT_MAX_BYTES,
  audioContentType,
  fmtDuration,
  useHiringUploader,
  type Rec,
  type Upload,
} from '@/lib/hiring';
import { WaveMark } from '@/components/kit';

export function TestDataConsent({ checked, onChange, id, audio = false }: { checked: boolean; onChange: (v: boolean) => void; id: string; audio?: boolean }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-md border border-[#e6ae9c] bg-[#fdf1ea] p-3 text-[12px] leading-snug">
      <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--orange)]" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={`checkbox-test-data-${id}`} />
      {audio ? (
        <span>I have permission to upload this recording. I agree it is sent to ElevenLabs for transcription only—not sentiment analysis or scoring. Sauce deletes the recording and transcript copies, including submitted copies, 30 days after upload. I can also request deletion from the Recordings section in my account. ElevenLabs uses its standard retention terms; provider logs and backups may remain longer. <a className="underline" href="https://elevenlabs.io/privacy-policy" target="_blank" rel="noreferrer">ElevenLabs privacy policy</a>.</span>
      ) : <span>I have permission to upload this document. It is stored privately by Sauce and is not sent to ElevenLabs. <a className="underline" href="mailto:klvstc@gmail.com">Email us</a> with a deletion request.</span>}
    </label>
  );
}

function Phase({ phase, error }: { phase: keyof typeof PHASE_LABEL; error: string | null }) {
  if (phase === 'idle') return null;
  return (
    <p role="status" className={`text-[12px] ${phase === 'error' ? 'text-[#a8321d]' : 'text-[var(--muted-ink)]'}`}>
      {phase === 'error' ? `${PHASE_LABEL.error}: ${error}` : `${PHASE_LABEL[phase]}${phase === 'done' ? '' : '...'}`}
    </p>
  );
}

/** UTF-8 .md / .txt upload with local plain-text preview. */
export function TextFileUpload({ id, label, hint, onUploaded, uploaded }: {
  id: string;
  label: string;
  hint?: string;
  uploaded?: { id: string; name: string } | null;
  onUploaded: (u: Rec<Upload>, text: string) => void;
}) {
  const { upload, phase, error } = useHiringUploader();
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function pick(f: File | undefined) {
    setLocalError(null);
    setFile(null);
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!TEXT_EXT.includes(ext)) return setLocalError('Only .md or .txt plain-text files are accepted. PDF and DOCX are not supported.');
    if (f.size > TEXT_MAX_BYTES) return setLocalError('File is larger than 256 KiB.');
    if (f.size === 0) return setLocalError('File is empty.');
    try {
      const t = new TextDecoder('utf-8', { fatal: true }).decode(await f.arrayBuffer());
      setText(t);
      setFile(f);
    } catch {
      setLocalError('File is not valid UTF-8 text.');
    }
  }

  async function send() {
    if (!file || !consent) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      const rec = await upload(file, { name: file.name, kind: 'markdown', contentType: ext === 'md' ? 'text/markdown' : 'text/plain', consent });
      onUploaded(rec, text);
      setFile(null);
    } catch { /* surfaced via phase */ }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-bold tracking-wide">{label}</span>
        {uploaded && <span className="chip chip-mint" data-testid={`status-uploaded-${id}`}><Check size={11} /> {uploaded.name}</span>}
      </div>
      {hint && <p className="text-[12px] text-[var(--muted-ink)]">{hint}</p>}
      <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[#b9c3af] bg-[#f8f7ef] px-4 py-4 text-[13px] hover:bg-[#f1f0e6]">
        <FileText size={18} className="text-[var(--orange)]" />
        <span className="flex-1">{file ? file.name : uploaded ? 'Replace with another .md or .txt file' : 'Choose a .md or .txt file (max 256 KiB)'}</span>
        <input type="file" accept=".md,.txt,text/markdown,text/plain" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} data-testid={`input-file-${id}`} />
      </label>
      {localError && <p className="text-[12px] text-[#a8321d]" role="alert">{localError}</p>}
      {file && (
        <>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--line)] bg-[#fffdf7] p-3 text-[12px] leading-relaxed">{text}</pre>
          <TestDataConsent id={id} checked={consent} onChange={setConsent} />
          <button type="button" className="pill pill-dark" disabled={!consent || phase === 'requesting' || phase === 'sending' || phase === 'finalizing'} onClick={send} data-testid={`button-upload-${id}`}>
            <UploadIcon size={13} /> Upload file
          </button>
        </>
      )}
      <Phase phase={phase} error={error} />
    </div>
  );
}

type RecState = 'idle' | 'requesting' | 'recording' | 'recorded' | 'error';

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

/** Record with MediaRecorder or pick an audio file, then upload with explicit consent. */
export function AudioCapture({ id, cta = 'Save this take', onUploaded }: { id: string; cta?: string; onUploaded: (u: Rec<Upload>) => void | Promise<void> }) {
  const { upload, phase, error, reset } = useHiringUploader();
  const [state, setState] = useState<RecState>('idle');
  const [recError, setRecError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<{ blob: Blob; name: string; type: string; url: string; seconds: number | null } | null>(null);
  const [consent, setConsent] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const cancelled = useRef(false);
  const timer = useRef<number | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => () => { cancelled.current = true; recRef.current?.state === 'recording' && recRef.current.stop(); stopTracks(); }, []);
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);

  async function start() {
    setRecError(null);
    reset();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('error');
      return setRecError('This browser cannot record audio. Upload an audio file instead.');
    }
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      cancelled.current = false;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stopTracks();
        if (cancelled.current) { setState('idle'); setElapsed(0); return; }
        const type = (rec.mimeType || mime || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks.current, { type });
        const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
        const seconds = Math.min(AUDIO_MAX_SECONDS, (Date.now() - startedAt.current) / 1000);
        setClip({ blob, type, name: `take-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`, url: URL.createObjectURL(blob), seconds });
        setState('recorded');
      };
      recRef.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      rec.start(1000);
      setState('recording');
      timer.current = window.setInterval(() => {
        const s = (Date.now() - startedAt.current) / 1000;
        setElapsed(s);
        if (s >= AUDIO_MAX_SECONDS && rec.state === 'recording') rec.stop();
      }, 250);
    } catch (e) {
      stopTracks();
      setState('error');
      const name = (e as DOMException)?.name;
      setRecError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone permission was denied. Allow microphone access in your browser settings, or upload an audio file.'
          : name === 'NotFoundError'
            ? 'No microphone was found. Connect one, or upload an audio file.'
            : 'Could not start recording. Try again or upload an audio file.',
      );
    }
  }
  const stop = () => recRef.current?.state === 'recording' && recRef.current.stop();
  const cancel = () => { cancelled.current = true; stop(); };
  const discard = () => { setClip(null); setState('idle'); setElapsed(0); reset(); };

  function pickFile(f?: File) {
    setRecError(null);
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!AUDIO_EXT.includes(ext)) return setRecError('Supported audio: webm, ogg, mp3, wav, m4a.');
    if (f.size > AUDIO_MAX_BYTES) return setRecError('Audio file is larger than 20 MiB.');
    const url = URL.createObjectURL(f);
    const probe = new Audio(url);
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration) && probe.duration > AUDIO_MAX_SECONDS) {
        URL.revokeObjectURL(url);
        setRecError('Audio is longer than 3 minutes (180 seconds).');
        return;
      }
      setClip({ blob: f, name: f.name, type: audioContentType(f.name, f.type), url, seconds: Number.isFinite(probe.duration) ? probe.duration : null });
      setState('recorded');
    };
    probe.onerror = () => { setClip({ blob: f, name: f.name, type: audioContentType(f.name, f.type), url, seconds: null }); setState('recorded'); };
  }

  async function send() {
    if (!clip || !consent) return;
    if (clip.blob.size > AUDIO_MAX_BYTES) return setRecError('Recording is larger than 20 MiB.');
    try {
      const rec = await upload(clip.blob, { name: clip.name, kind: 'audio', contentType: clip.type, consent });
      await onUploaded(rec);
      setClip(null);
      setState('idle');
      setElapsed(0);
    } catch { /* surfaced via phase */ }
  }

  const busy = phase === 'requesting' || phase === 'sending' || phase === 'finalizing';
  const pct = Math.min(100, (elapsed / AUDIO_MAX_SECONDS) * 100);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[#fffdf7] p-4">
      {(state === 'idle' || state === 'error' || state === 'requesting') && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="pill pill-orange" onClick={start} disabled={state === 'requesting'} data-testid={`button-record-${id}`}>
            <Mic size={14} /> {state === 'requesting' ? 'Waiting for microphone...' : 'Record'}
          </button>
          <label className="pill pill-outline cursor-pointer">
            <UploadIcon size={13} /> Upload audio
            <input type="file" className="sr-only" accept=".webm,.ogg,.mp3,.wav,.m4a,audio/*" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} data-testid={`input-audio-${id}`} />
          </label>
          <span className="text-[11px] text-[var(--muted-ink)]">Up to 3:00 and 20 MiB</span>
        </div>
      )}
      {state === 'recording' && (
        <div className="space-y-3" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="rec-dot h-3 w-3 rounded-full bg-[var(--orange)]" aria-hidden />
            <span className="font-mono text-[15px] tabular-nums" data-testid={`text-timer-${id}`}>{fmtDuration(elapsed)} / 3:00</span>
            <WaveMark live className="flex-1 text-[var(--orange)]" />
          </div>
          <div className="h-1 overflow-hidden rounded bg-[#efe8da]"><div className="h-full origin-left bg-[var(--orange)]" style={{ transform: `scaleX(${pct / 100})` }} /></div>
          <div className="flex gap-2">
            <button type="button" className="pill pill-dark" onClick={stop} data-testid={`button-stop-${id}`}><Square size={12} fill="currentColor" /> Stop</button>
            <button type="button" className="pill pill-outline" onClick={cancel} data-testid={`button-cancel-${id}`}>Cancel</button>
          </div>
        </div>
      )}
      {state === 'recorded' && clip && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="font-semibold">{clip.name}</span>
            <span className="text-[var(--muted-ink)]">{fmtDuration(clip.seconds)} {clip.seconds != null && '·'} {(clip.blob.size / 1024).toFixed(0)} KiB</span>
          </div>
          <audio controls src={clip.url} className="h-11 w-full" data-testid={`audio-preview-${id}`} />
          <TestDataConsent id={`consent-${id}`} checked={consent} onChange={setConsent} audio />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="pill pill-dark" disabled={!consent || busy} onClick={send} data-testid={`button-save-take-${id}`}><Check size={13} /> {cta}</button>
            <button type="button" className="pill pill-outline" disabled={busy} onClick={discard} data-testid={`button-discard-${id}`}><Trash2 size={13} /> Discard</button>
          </div>
        </div>
      )}
      {recError && <p role="alert" className="text-[12px] text-[#a8321d]">{recError}</p>}
      <Phase phase={phase} error={error} />
    </div>
  );
}
