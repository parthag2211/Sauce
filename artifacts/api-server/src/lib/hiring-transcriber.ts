import { createHash } from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { ObjectStorageService } from "./objectStorage";
import type { Transcriber, VoiceResult } from "./hiring-worker";

export const ASR_OPTIONS = Object.freeze({
  model_id: "scribe_v2", no_verbatim: false, timestamps_granularity: "word",
  diarize: false, tag_audio_events: false, use_multi_channel: false,
  use_speaker_library: false, detect_speaker_roles: false, webhook: false,
  temperature: 0,
});

export function normalizeAsr(raw: unknown, input: { uploadId: string; sourceHash: string }): VoiceResult {
  if (!raw || typeof raw !== "object") throw Error("invalid_provider_result");
  const r = raw as Record<string, unknown>;
  if (typeof r.text !== "string" || !r.text.trim() || !Array.isArray(r.words) || !r.words.length) throw Error("invalid_provider_result");
  const words = r.words.map((w: any) => {
    if (!w || typeof w.text !== "string" || !w.text.length || !["word", "spacing", "audio_event"].includes(w.type) ||
      !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.start < 0 || w.end < w.start) throw Error("invalid_provider_result");
    return { text: w.text, start: w.start, end: w.end };
  });
  return { ...input, provider: "elevenlabs", model: ASR_OPTIONS.model_id, verbatim: true, text: r.text, words,
    rawProviderOutput: raw, providerOutputHash: createHash("sha256").update(JSON.stringify(raw)).digest("hex"),
    options: ASR_OPTIONS };
}

export function createElevenLabsTranscriber(
  readBytes = async (path: string) => (await (await new ObjectStorageService().getObjectEntityFile(path)).download())[0],
  proxy = (body: FormData) => new ReplitConnectors().proxy("elevenlabs", "/v1/speech-to-text?enable_logging=true", { method: "POST", body }),
): Transcriber {
  return async input => {
    const bytes = await readBytes(input.objectPath);
    if (bytes.length > 20 * 1024 * 1024 || createHash("sha256").update(bytes).digest("hex") !== input.sourceHash) throw Error("source_hash_mismatch");
    const body = new FormData();
    body.set("file", new Blob([new Uint8Array(bytes)]), "recording");
    for (const [key, value] of Object.entries(ASR_OPTIONS)) body.set(key, String(value));
    const response = await proxy(body);
    if (!response.ok) throw Error(`provider_http_${response.status}`);
    // Bound the response without logging applicant content or provider error bodies.
    const reader = response.body?.getReader();
    if (!reader) throw Error("empty_provider_response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2 * 1024 * 1024) throw Error("provider_response_too_large");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return normalizeAsr(JSON.parse(Buffer.concat(chunks).toString("utf8")), input);
  };
}
