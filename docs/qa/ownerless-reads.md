# Owner-scoped reads without an authenticated owner

- Scope: groups, all-students, homework and hard-submissions shared read loaders.
- Risk: after session disappearance, null UUID filters generate invalid REST requests.
- Base: 07614ca41d3ffaf22de058672aa7a37e759f8548 plus four early returns; no server writes or auth retry changes.
- Environment: cloud Node 24.22.1; actual TypeScript modules executed with mocked owner and transport boundaries. No real user data or credentials.
- Independent invariants: absent owner -> empty result and zero transport operations; teacher A/B -> only the selected teacher's filter. No assumption that this fixes the authentication failure itself.
- Reproduction: node --experimental-vm-modules scripts/checkOwnerlessReads.mjs
- Baseline: all four absent-owner cases fail; patched: all four pass including signed-in A/B scopes. Assertions unchanged across before/after.
- The initial module-only result above is superseded for browser/device coverage by [PR29 acceptance](pr29-browser-phone-scenario.md). Product controls/layout are unchanged; released-build acceptance remains separate.
- Coverage: only null-owner REST400 subcase. Mixed API error groups also include unrelated transport/auth/permission/slow responses; do not close a whole collector group with this patch.
- Release: not authorized. No confirmed_fixed status; release check and exact released-SHA owner verification required later.
