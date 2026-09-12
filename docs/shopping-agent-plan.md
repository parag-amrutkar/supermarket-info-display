# Shopping assistant implementation plan

## Goal
Connect the existing voice transcript and typed input to a tool-using shopping assistant. Preserve conversation context within a shopper session and start clean when that session changes.

## Session contract
- Keep shopper conversations separate from the staff demo sign-in. Provide an explicit New conversation action.
- Scope tab-local history to the signed-in tenant and staff session, plus a shopper conversation ID. Retain it across reloads in the same tab; clear it on sign-out, tenant/session changes, or New conversation.
- Abort in-flight transcription/generation on reset or unmount so an old response cannot enter a new conversation. Do not persist chat in the database or across tabs.

## Implementation
1. Read the installed Next.js route/client guides and AI SDK v7 declarations before coding. Preserve the existing voice controller and provider registry.
2. Extend the chat endpoint into a bounded tool loop with validated requests, readable errors, cancellation, and store context resolved from a known tenant. Treat client history as untrusted: accept conversational text, never client-supplied system instructions or fabricated tool results.
3. Expose narrow read-only inventory tools for search, SKU detail, and aisle inventory using existing database functions. Resolve store IDs outside model arguments. CVS maps to CVS-DEMO-001; Sunrise has no configured inventory and must never return CVS results. Keep results bounded and gracefully distinguish unavailable database access from no matches.
4. Require tool evidence for stock and precise location; disclose demo inventory, unknown restock dates, and sponsorship. Answer conversational requests without mandatory database access. Keep answers concise and avoid unsupported medical advice.
5. Add a reusable chat controller/panel to submit editable voice transcripts or typed questions, render streamed answers and previous turns, and show waiting/error/retry/stop states. Prevent duplicate submissions. Keep the kiosk's layout and accessibility conventions. Wire tenant display and inspect the product screen voice entry so it has a coherent submission path too.
6. Persist bounded, validated text history in sessionStorage. Handle corrupt or unavailable storage safely. Ensure resets clear transcript, errors, history and pending work. Maintain context when navigating within the same session.
7. Add meaningful automated verification for request validation, store/tool scoping, failures, multi-turn history and session isolation. Use deterministic provider/database mocks where useful; do not represent mocked results as live verification.

## Verification and completion
- Run lint, TypeScript and production build; distinguish pre-existing/environment failures.
- Exercise real UI submission, streamed answer, follow-up, reload persistence, New conversation and session changes. Check cancellation cannot resurrect previous history.
- Run a live read-only inventory lookup and live model round trip if configured; report any unavailable external dependency precisely.
- Primary agent independently reviews the Terra implementation, fixes material issues, and records final results below.

## Scope boundaries
No database schema changes, real authentication, autonomous writes, shelf hardware integration or speech synthesis are required. Existing demo sign-in is not authorization. Existing unrelated untracked files must be preserved.

## Results
Implemented by the requested Terra subagent and independently reviewed and exercised by the primary agent on 2026-09-12.

### Delivered
- Editable voice transcripts and typed questions submit to the streaming shopping assistant in the selected store.
- Read-only search, SKU and aisle tools use store context resolved on the server. Sunrise cannot query the CVS demo inventory.
- New chat starts a separate shopper conversation, clears the transcript and history, and aborts pending work. Staff sign-out clears the active saved conversation. Tenant/staff session changes remount the assistant.
- Same-tab reload restores the active conversation. Retention and model context are bounded to the most recent 16 plain-text messages, up to 800 characters per message; raw tool/reasoning parts are never persisted or trusted from clients. Storage failure falls back to memory. Closing the tab ends persistence.
- The welcome screen directs staff to select a store before asking inventory questions. Product pages already link back to this kiosk flow.
- OpenRouter is configured as requested using the existing key and `openrouter:openai/gpt-4.1-mini`. No credentials were added to source control.

### Independent review fixes
- Live testing exposed an existing OpenRouter provider issue: its unversioned provider returns v4 models, which the AI SDK registry mistakenly adapts as v2. An explicit v4 adapter now preserves tool-call finish reasons and allows the tool loop to execute.
- Added a persistent demo-inventory disclosure, stricter saved-history validation, clearer question-clearing copy, and explicit tenant/staff component identity.
- Strengthened prompts to require current tool evidence for prices as well as locations/stock, distinguish missing data from out-of-stock, and return readable stream errors.

### Verification
- `npm run test:shopping-agent`: four passing regression tests, exercising the actual application registry/route/session helpers with deterministic mocks. Covers provider tool execution, request validation, store isolation and database failures.
- `node scripts/verify-voice-input.mjs`: existing voice lifecycle and transcription-route simulations pass. A physical microphone recording was not repeated.
- Live Supabase public inventory read: 100 products accessible. Live OpenRouter tool loop returned coffee SKU CVS-442624 at aisle 5, rack 4, shelf 3, position 3.
- Browser test: typed product question returned that shelf location; follow-up “How much does it cost, and is it in stock?” returned $4.75 and 9 simulated units. Both turns survived reload.
- Browser test: New chat during generation cleared old history/transcript; a subsequent context question correctly had no knowledge of the previous product. No stale answer reappeared.
- Browser test: sign-out and Sunrise sign-in started empty history; Sunrise explicitly reported inventory unavailable instead of returning CVS data.
- `npx tsc --noEmit` and `git diff --check`: pass.
- Changed application files pass ESLint. Full `npm run lint` retains two baseline errors in `components/ui/carousel.tsx:98` and `hooks/use-mobile.ts:14`.
- `npm run build -- --webpack`: production build passes. Default Turbopack build is blocked by this environment's compiler-worker port-binding restriction (`EPERM`); no build configuration was changed.

### Current boundaries
Answers render as text; speech synthesis and automatic shopper-presence/inactivity resets remain outside this implementation. Staff sign-in is still the existing demo flow, not server authentication. Inventory is demo data and only CVS is connected.
