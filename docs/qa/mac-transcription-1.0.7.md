# Transcription 1.0.7: incomplete model recovery and visible preparation

Base: 94a8f373. Source candidate: b1d431ec. This fixes the reported `config.json` FileNotFoundError; native window lifetime fix from 1.0.6 is retained.

## Expected behavior

A weights-only cache must not be accepted as a complete model. Repair downloads missing files from the same revision without deleting existing weights. Recognition and chapter generation must select a complete snapshot rather than the first matching file in any snapshot. Preparation without a measurable percentage remains visibly active.

## Evidence

- Python regression suite: 32 tests passed, including missing config, malformed config, broken weight symlink, incomplete sharded weights, required tokenizer files, complete offline cache, failed network repair and selection among multiple snapshots.
- Actual public Whisper snapshot `a4aaeec0636e6fef84abdcbe3544cb2bf7e9f6fb`: isolated cache with 1,613,977,612 bytes of existing weights and deliberately absent config. Real download restored config. Weight path and size remained unchanged.
- With `HF_HUB_OFFLINE=1`, the repaired cache transcribed an 8.5-second synthetic spoken recording into three expected English sentences about photosynthesis. Qwen generated the chapter «Фотосинтез в растениях» offline. No teacher media or production course data used.
- Actual TranscriptionAction/Review in a fixture browser, 1280px and 390px, light/dark: download at 0%, audio preparation, model preparation, speech initialization without metrics, then 50% speech progress. Active step, busy indicator and numeric counter assertions passed; no page errors or horizontal overflow. Screenshots reviewed. The fixture initially lacked the publishable-key setting and had an invalid click/wait assumption; those harness errors were corrected before the passing run.
- TypeScript typecheck and release:check passed for source candidate.

Limits: no claim of physical teacher-device acceptance or complete constructor/server autosave acceptance. Native iPhone/iPad/Android not installed; the shared web component received narrow-layout regression checks only. Speaker separation and slide OCR were not changed. Fixture tests cover progress display, while actual offline model inference is a separate check.

## Release package

Signing/notarization workflow 43590573567 succeeded for b1d431ec. Mounted DMG app passes strict signature and staple validation; Gatekeeper accepts the notarized application. App version is 1.0.7; changed Python files match the tested source byte-for-byte. Applications shortcut targets /Applications. DMG checksum verified.

DMG SHA-256: c2980b05a74b4cb48fdd476e39d8c2afa79463655fc504448bf24163e231afb2.
