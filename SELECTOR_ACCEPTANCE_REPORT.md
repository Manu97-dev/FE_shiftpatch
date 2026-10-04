# Selector acceptance audit

Review checkout branch: `main` (changes uncommitted). Original implementation branch: `codex/selector-acceptance`.

Frontend worktree: `/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch`

Backend inspection worktree: `/Users/nohelia/.codex/worktrees/29c2/BE_shiftpatch` (unchanged).

Fetched main on both repositories; frontend base `be96b1f`, backend base `8f4c4ac`, both match origin/main. No AGENTS.md was found in the repository trees. Changes are uncommitted for review. No merge, push, deployment, migration, seeder, schema push or data reset was performed.

| Exact ID | Audit result | Location | Reason / behavior |
|---|---|---|---|
| `login-email-input` | Already existed | [login-form.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/auth/components/login-form.tsx:36) | Actual email input. |
| `login-password-input` | Already existed | [login-form.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/auth/components/login-form.tsx:43) | Actual password input. |
| `login-submit-button` | Already existed | [login-form.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/auth/components/login-form.tsx:49) | Actual submit button. |
| `shift-list-item` | Already existed | [available-shifts.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/shifts/components/available-shifts.tsx:53) | Forwarded through ShiftList to each actual ShiftCard li. |
| `shift-claim-button` | Already existed | [available-shifts.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/shifts/components/available-shifts.tsx:53) | Actual per-shift claim button. |
| `shift-cancel-button` | Already existed | [my-shifts.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/shifts/components/my-shifts.tsx:66) | Actual future assignment cancellation button. |
| `credential-upload-input` | Newly added | [credential-documents.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/credentials/credential-documents.tsx:66) | Actual file input; existing automatic upload preserved. |
| `credential-expiry-date-input` | Newly added | [credential-documents.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/credentials/credential-documents.tsx:65) | Upload expiry date input; does not identify separate existing-document edit inputs. |
| `agency-post-shift-button` | Already existed | [agency-dashboard.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/agencies/components/agency-dashboard.tsx:46) | Dialog Trigger asChild keeps ID on actual button. |
| `agency-post-shift-submit-button` | Already existed | [create-shift-form.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/shifts/components/create-shift-form.tsx:49) | Actual new-shift submit button. |
| `admin-dashboard-shift-table` | Already existed; corrected placement | [admin-shift-table.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/admin/components/admin-shift-table.tsx:8) | Previously tagged a ul of cards; now a real visible table with role, agency, schedule and status columns. Existing content, colors, rounded rows and horizontal overflow retained. |
| `admin-shift-status-badge` | Already existed; moved with report | [admin-shift-table.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/admin/components/admin-shift-table.tsx:21) | Each real table row status span, preserving copy and data-status=open/filled. |
| `audit-log-table` | Newly added | [audit-overview.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/features/admin/components/audit-overview.tsx:45) | Existing semantic audit table. Table appears when events exist. |
| `timesheet-table` | Cannot currently be added | Both src trees | No timesheets page, component, route, schema or API found by case-insensitive source search in either repository. No fake table or new timesheet feature added. |
| `notification-banner` | Already existed; coverage added | [home-layout.tsx](/Users/nohelia/Documents/ManuelProjects/FE_shiftpatch/src/shared/components/home-layout.tsx:55) | Existing claim/cancel success and dialog errors retained. Added successful sign-in and shift creation confirmations, credential success/errors, and sign-out error tagging. |

Admin status semantics: the backend supports only open and filled. Cancelling an assignment clears claimedBy and returns open (`shifts.repository.ts:64`). The existing Filled display copy remains Assigned, In progress or Past assignment according to schedule. No cancelled status was invented.

Confirmation changes required by the supplied AC: sign-in previously navigated without a success banner; it now displays Signed in successfully in the workspace using in-memory auth state, cleared on sign-out/session clear and not populated by session restoration. Shift creation previously silently closed its dialog; it still closes and now displays one Shift created successfully banner, cleared when opening the next new-shift dialog. Credential upload/edit/export feedback keeps existing copy and receives the selector; individual download success now reports Document downloaded. New credential attempts clear previous mutation feedback so success and error for the same attempt do not coexist. Success uses role=status and error role=alert, both with notification-banner.

Rendered selector coverage extends existing flow tests for login success/errors, claim success/errors and per-card claim controls, cancellation button, credential actual inputs and upload success/errors, agency creation controls and success/errors, semantic admin table and row statuses, and semantic audit table.

Validation: npm test passed all 126 tests across 17 files; npm run build passed (TypeScript and Vite); npm run lint passed; git diff --check passed. Build emitted the existing large-chunk advisory. Tests and scripts were inspected before running: frontend Vitest tests mock requests, with no database startup or migration setup. No backend tests were needed for this frontend-only change. Implementation was verified in the isolated worktree using its node_modules symlink. At the user’s subsequent request, changes were transferred to the frontend main checkout for manual review without committing. The original worktree remains available as a backup. Browser visual QA was not performed; table layout is verified structurally in rendered DOM tests and compile-checked.
