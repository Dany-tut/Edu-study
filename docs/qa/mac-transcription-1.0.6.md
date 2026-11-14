# Mac transcription 1.0.6: close and reopen

Scope: native Mac helper window lifetime. Website layout and transcription engine are unchanged.

## Cause and change

The 1.0.5 crash report identifies `objc_msgSend` inside `applicationShouldHandleReopen` after closing the window. An ARC-owned, programmatically created NSWindow retained the default release-on-close behavior. Set `isReleasedWhenClosed = false` so the same window and its controls remain valid for reopen and asynchronous status callbacks.

## Acceptance

- Base: `770c060afa5724deef7d787a49b35406c31355b7`; native fix: `cf1021fa`; signed source: `121aaa54`; installer fingerprint: `984a0a11c5ad`.
- Local Mac: macOS 27.2, Apple Silicon. Isolated AppKit harness uses the actual source window construction, reopen and status-update methods; only service startup is suppressed.
- Negative control, removing only the fix: exits with signal 5 under NSZombieEnabled, reporting a message to a deallocated NSWindow.
- Fixed optimized harness: 30 close/reopen cycles plus delayed status updates after closing, exit 0. An initial 20-second instrumented run timed out; it is not counted as a pass. The normal run completed within 45 seconds.
- Actual signed 1.0.6 app installed in `/Applications`, opened, closed using the window button, reopened through Finder: visible window reports version 1.0.6, build 984a0a1, and service running; process remains alive. No IskraTranscription crash report appeared on the test Mac.
- Signing/notarization workflow: `43586874543`, success. App passes strict deep signature validation, staple validation and Gatekeeper assessment.
- DMG mounts read-only, passes checksum verification, contains the same notarized app and `Applications -> /Applications`. Stable app filename allows replacing 1.0.5 when dragging into Applications.
- DMG SHA-256: `35054d6f5a940231ca58fa80c5a2a8c172fdebbd8fcf93b5e90ce4f57b8cce18`.

Limits: teacher's macOS 26.3.1 not tested locally; video recognition/save stall is a separate unresolved report. iPhone/iPad/Android and both website themes were not retested because this change only updates the native helper and its download version. This does not claim end-to-end transcription acceptance.
