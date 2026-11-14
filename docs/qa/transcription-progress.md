# Transcription progress acceptance

Base: 504bfcbe47b73610e37f6650b5301ce42ff0f0f1. Scope: shared web progress display; no native app or worker changes. Existing teacher job must continue untouched.

Expected: all seven rows have a stable status. Completed rows retain 100%; active measured work shows 1–99% (100% only after stage transition); zero or unavailable counters show “В процессе…”; future rows show “Ожидает”. Missing metrics in the same job/stage retain the last measurement; a new worker stage must not inherit the prior percentage. No fabricated timed percentages.

Planned fixture coverage: widths 390 and 1280, light/dark, zero → measured → metric omitted → next stage for all rows, final stage measured. Screenshots, no overflow or JS errors. Buttons/job API are unchanged. Physical devices and real teacher job not controlled; fixture evidence is not full constructor/server E2E acceptance.

Release safety: module source, module fingerprint and DMG remain unchanged. Deploy only web code. Existing open page does not receive this change until reloaded; no command or request to restart/update/cancel the teacher's job is sent.

Validation: TypeScript passed. Browser fixture passed all seven stage transitions at 1280/390 in light/dark, including zero → 35% → missing metric (35% retained) → 99% pending completion → next row. Completed counters and waiting row counts asserted. No JS errors or page horizontal overflow. Narrow light and desktop dark screenshots reviewed. No new scroll container introduced. Worker/installer/version/DMG diff is empty. Physical iPhone/iPad/Android not tested; shared component narrow-layout only.
