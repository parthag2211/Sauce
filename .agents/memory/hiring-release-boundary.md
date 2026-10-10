---
name: Hiring release boundary
description: Why the first hiring release stays internal-test-only without automatic scoring or live transcription.
---

The user approves sending audio to ElevenLabs, paid transcription calls, and real-applicant eligibility. Audio consent is transcription-only, not sentiment analysis. Sauce retains recordings/transcript copies for 30 days, deletion requests go by email, and the user explicitly approved ElevenLabs' standard retention after declining zero retention. Disclose that provider logs/backups may last longer. Sagar owns the separate scoring approval.

**Why:** The connected account cannot enable enterprise-only zero retention, and the user explicitly chose standard retention instead of it. The provider warns that ordinary deletion may leave logs and backups. Do not claim provider data is deleted after 30 days; disclose the distinction from Sauce's retention. An unconfigured score or unavailable transcript must not silently become a default or synthetic result.

**How to apply:** Keep ASR consent explicit and limited to transcription; preserve original versus reviewed transcripts, disclose provider retention, and never interpret accepted as hired. Do not enable numerical scoring without Sagar's approval.
