export const CONSENT_VERSION = "transcription-standard-30d-v1";
export const DELETION_EMAIL = "klvstc@gmail.com";
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function isExpired(data: any, now = Date.now()): boolean {
  return !!data.deletedAt || (typeof data.expiresAt === "string" && Date.parse(data.expiresAt) <= now);
}

// Apply on reads as well as cleanup: downtime must not extend access to transcripts.
export function redactExpiredEvidence(value: any, now = Date.now()): any {
  if (Array.isArray(value)) return value.map(v => redactExpiredEvidence(v, now));
  if (!value || typeof value !== "object") return value;
  const copy = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactExpiredEvidence(v, now)]));
  if (isExpired(copy, now)) {
    for (const key of ["originalAsr", "reviewedTranscript", "rawProviderOutput", "providerOutputHash"]) delete copy[key];
    copy.words = [];
    copy.processingState = "unavailable";
    copy.errorCode = "retention_expired";
  }
  return copy;
}
