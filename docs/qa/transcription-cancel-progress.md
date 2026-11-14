# Transcription cancellation and measured diarization progress

Base: 612c62a10d349d8a6c19901c8df430f1056eab73. Scope: loopback worker and shared web component; native launcher unchanged. Teacher machine is remote and is not operated by this QA.

## Acceptance scenarios

- Owner DELETE /jobs/id requests cancellation, UI waits for confirmation. Supervisor stops the dedicated process group (all children), only then stores cancelled and releases the serial gate. Late success cannot override cancellation. Cancelled jobs never resume. Other owners get404.
- Update during work remains409; no automatic replacement of active code. Older workers expose no cancellation capability: UI explicitly explains the limitation and does not fake stopping. Busy-update is deferred rather than labelled broken/requiring reinstall.
- Active diarization: measured sherpa callback processed_chunks/total_chunks, explicitly labelled audio-fragment phase, visible fill and server-derived elapsed time surviving reload. Later phases have their own counters; unknown totals have moving indeterminate fill. Completed rows show only a checkmark, no100%. Reduced-motion disables the indeterminate animation.
- Diagnostic log: audio duration, thread count, sherpa version, phase durations, measured counters, supervisor liveness and progress age. Liveness is not proof of progress/hang. No recording content is logged.

## Evidence

35 Python regression tests passed. New real subprocess regression: TERM-resistant child, late success on TERM, whole group stopped by escalation, resources/gate released, repeated new job, unauthorized cancellation, update409, cancellation before launch and persisted cancellation not resumed.

Real model test (sherpa-onnx2.0.1, existing ONNX models, synthetic speech, isolated temp home): 203.7 seconds of audio produced actual callback1/200; dedicated group contained job-worker and diarize processes. DELETE stopped both in0.34 seconds; no live group members, state cancelled without done, gate free. The next8.5-second diarization job completed successfully. Full recognition was intentionally checkpointed/skipped in this test; it tests the actual diarization and supervisor integration. Teacher PID5354 was not accessed or killed.

Browser fixture with actual component:1280/390 × light/dark;42% fill, explicit phase, server elapsed10:23 surviving reload, completed rows without100%, unknown-total moving fill, DELETE once, stopping state disabled until confirmed, cancelled state and new-start UI. No JS errors or horizontal overflow. Screenshots reviewed. One initial test correctly caught a stale42% when the same stage entered an unmeasured phase; fixed by accepting explicit zero-total reports to clear prior metrics. Physical iPhone/iPad/Android and full server-backed constructor were not controlled.

## Performance limits

Previous configuration used sherpa's default single CPU thread; now explicitly bounded to four. It also concatenated all of a voice's audio before truncating to60 seconds; now collects at most60 seconds before allocation. These remove identifiable inefficiencies, but the teacher's10-minute delay is not conclusively diagnosed without CPU and phase logs. No fixed speedup or hang detection is claimed.

Official callback reference: https://github.com/k2-fsa/sherpa-onnx/blob/master/python-api-examples/offline-speaker-diarization.py . Installed API doc confirms callback(processed_chunks,num_chunks) and nonzero return aborts.

## Release boundaries

Publish web + auto-updatable Python module. Native app/DMG stays1.0.7; source fingerprint changes. New cancellation cannot control a still-running old service until it finishes/stops and updates. No teacher process was restarted to publish. Do not tell users that updating this site alone cancels an old job.

Observer-failure regression also passes: an exception while observing an active worker stops its entire process group before waiting/releasing resources.
