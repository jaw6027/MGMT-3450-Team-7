# CSTC Social Studio

A responsive social marketing workspace for California Safety Training Corporation. The complete manual workflow runs on a single Node server with SQLite and filesystem media. Automatic publishing and advertising spend are disabled in every mode.

## Start

Requires **Node.js 24 or later** (uses built-in `node:sqlite`). There are no runtime dependencies to install.

```bash
cd apps/social-studio
npm start
```

Open **http://localhost:3000** and choose **Open demonstration**. The demonstration uses simulated identities, illustrative campaigns and audience recommendations, and a persistent server database. It is not production authentication. The administrator is Alex; author Jordan; qualified reviewer Sam; publisher Casey; analyst Taylor. Use the top-right simulated identity selector to exercise each role.

Environment options: `PORT` (3000), `HOST` (0.0.0.0), `DATA_DIR` (app-local `data/`), `DEMO_MODE` (true), `COOKIE_SECURE` (false for local HTTP). Do not expose the demo with real customer data. Running a local server is not a public deployment; no hosting deployment has been created.

### Authenticated shared mode

Use a **separate empty data directory**, behind an HTTPS reverse proxy. Set secrets through your runtime secret manager or shell environment; never commit an `.env` file. For initial startup, supply `DEMO_MODE=false`, `DATA_DIR` pointing at persistent private storage, `COOKIE_SECURE=true`, and a strong `ADMIN_PASSWORD` of at least 14 characters. The initial username is `admin`. Only the password hash is stored. The initial password is used only when creating the first account.

An example configuration (password intentionally omitted):

```bash
DEMO_MODE=false DATA_DIR=/path/to/private/persistent/studio COOKIE_SECURE=true npm start
```

Set `ADMIN_PASSWORD` in the process environment before that command. For local HTTP testing of shared mode, use `COOKIE_SECURE=false`. The proxy must preserve `Host` and the HTTPS origin used by the browser. Configure a matching host/port in the forwarded Host header. The app checks browser mutation origins against the selected HTTP/HTTPS mode.

Sign in as admin, create teammates and assign multiple roles in **Settings & team**. Give a separate teammate Reviewer permission, designate qualified technical reviewers, and add Publisher and Analyst roles as needed. Authors cannot approve their own drafts. Admin can update roles, disable accounts, revoke sessions, and reset passwords. Shared mode does not allow simulated login. A workspace records its mode and refuses to open in the other mode, preventing an accidental authentication downgrade.

This is a single-workspace, single-server starter, not a managed enterprise authentication service. SSO, MFA, password-reset email, malware scanning, encryption-at-rest management and a managed media/object store are not included. Deployments require your own HTTPS, backups, monitoring and operational access policies. No deployment is part of this delivery.

## Functioning features

- Dashboard with live content counts, outstanding reviews, revisions, overdue reminders, manual destinations, campaign progress and inquiry follow-ups. No fabricated performance data.
- Editable company facts with source URLs and verification dates, configurable contacts and messaging provenance, bio confirmation, logo path, provisional palette and writing recommendations.
- Reusable audience profiles distinguish website industry facts from inferred roles, needs and platform recommendations.
- Campaign plans with confirmed offerings, audience, dates, assignments, goals, themes, CTA, UTM naming and metrics. Five editable template types.
- Platform-specific template drafting for Instagram, TikTok, Facebook and LinkedIn, including captions, carousel/story/reel concepts, hooks, scripts, shot lists, text overlays and prompts. No AI service is implied.
- Independent destination drafts, media selection, previews, caption counts, tone/goal/length controls, accessibility text, source notes, comments, revisions and approval history. Generated drafts remain unverified until reviewed.
- Month, week, day and list calendar views; search and filters for platform, campaign, audience, status, assigned author/reviewer/publisher and publishing mode. Edit dates using offset-qualified ISO strings, with IANA display zones. Explicit offsets disambiguate daylight-saving overlaps. Calendar dates never cause publication.
- Server-enforced Draft → In Review → Changes Requested / Approved → Ready to Post → Posted workflow. Self-approval blocked; assigned qualified reviewer required for technical content. Common technical terms also trigger review. Human judgment is still necessary to identify technical guidance and unsupported claims.
- Approval invalidation on draft, media permissions, brand, destination and platform-policy changes. Optimistic versions reject stale draft edits. Posted records are immutable.
- Blocking checks for captions, configured account domain, reviewed requirements, formats, configured text/media limits, missing media, permissions/restrictions/expiry, fact verification, qualified review, missing approval, CTA configuration and duplicate content/slots. Warnings cover link availability, link limitations, accessibility and suspicious claim language.
- Manual preparation with copyable approved caption, media downloads and ordering instructions, accessibility descriptions, platform guidance, verified contacts, destination links and required final checklist. Record live URL, explicit publication time, notes and authenticated publishing teammate. Always labeled **Team-confirmed publication**.
- Private server media storage, file-size and signature validation for PNG/JPEG/WebP/MP4; permission records, reviewer approval, campaign tags, restrictions and expiry. Metadata edits reset affected approvals.
- UTM builder preserves existing URL parameters, previews the inserted link, supports editable source/medium/campaign/content and stores per-post tracking data on save. No personal information should be placed in UTMs. Conversion attribution requires a separate analytics source.
- Role-limited manual inquiries from calls, emails, DMs, website forms and campaign links; statuses, assignment, related campaign/post, offering, notes and follow-up dates. No automatic inquiry capture is claimed.
- Manual reach, impressions, views, interactions, clicks, inquiries and qualified leads with date/platform/campaign/theme filters, timestamps, definitions and CSV exports. Missing data differs from zero. Rates require all component values and a positive denominator; unlike platform definitions are not treated as equivalent.
- In-app reminders refresh every minute while the page is open. No email or background notification service is configured.
- Advertising planning and CSV export with objective, platform, audience, geography, creative, landing page, proposed currency/budget/alert threshold, dates, reviewer and separate budget approver. Review summary explicitly states that no spend is authorized.
- Keyboard-accessible dialogs with focus trapping and Escape, labeled forms, visible focus, textual status labels, mobile navigation and responsive tables/calendar.

## Demonstration-only and unavailable features

**Queue simulation:** In demo mode, Settings → Explore queue simulation offers a manually stepped, SQLite-persisted job lifecycle. Administrator must explicitly allow simulation steps. A Publisher can queue an approved draft with passing checks, exercise processing, definite failure, safe retry, uncertain outcomes, reconciliation, cancellation and a simulated confirmation. Idempotency uses post ID + revision. Edits cancel pending jobs. Pause blocks new attempts. These jobs never call a social API and never change a post to Published. Simulation is unavailable in shared mode.

**Live publishing/reporting:** No OAuth adapter, token store, real scheduling worker or live reporting adapter is implemented. Credentials alone will not enable these features. Settings exposes official setup references, reviewed requirements and manual destination configuration; all API connections show disconnected. See [INTEGRATIONS.md](INTEGRATIONS.md) for the exact engineering and external requirements.

**Live advertising:** No ad-creation or spending endpoint exists. Planning does not approve a budget or launch anything. Platform-confirmed pauses, spend polling and automatic spend alerts are unavailable. The proposed authorization screen cannot authorize spending. Organic approval never authorizes it.

**Link availability:** The server validates link syntax and official destination account domains. It makes no outbound link requests and never claims availability. A teammate must open and check every link before posting. This avoids server-side request forgery. Detailed image/video duration, dimensions, codec, music rights and changing platform/account restrictions still need manual verification against official documentation; configured format, count, byte and caption limits supplement that review.

## Verify a complete manual workflow

1. Review **Brand profile** and sources; validate an **Audience profile** or create one.
2. As Administrator, configure a real official manual destination and review current official format/text/media requirements in **Settings**. Blank review dates intentionally block Ready to Post. Do this before approving content; policy edits invalidate approval.
3. As Author, create a campaign, confirm its offering, and create platform drafts from one idea. Set audience, independent captions, CTA, assignments, explicit-offset reminder and review deadline. Upload permission-cleared media; Reviewer approves its rights.
4. Save the draft with fact/source checks and submit for review. As Reviewer, comment and request changes. As Author, revise and resubmit. As the assigned Reviewer, approve; technical material requires a qualified reviewer’s explicit confirmation.
5. Open Calendar or in-app reminders. Dates only remind; the app must remain open for refresh.
6. As Publisher, mark content Ready to Post after all blocking checks pass. Open Prepare to Post, copy the caption and download media. In real use, the teammate posts on the social platform manually. **Development tests must not publish.**
7. Afterward record a live post URL and explicit-offset actual time, then confirm the final checklist. Result is team-confirmed, independently per platform.
8. As Analyst, add an inquiry, assign a follow-up, and enter available platform results; leave unknown values blank. Review and export results.

## Tests

```bash
npm run check
npm test
```

Eight automated HTTP tests use isolated temporary databases and local ephemeral ports. They verify the manual lifecycle, revision requests and comments, role checks, self-approval prevention, qualified review, approval resets, stale edits, date/zone validation, disconnected destinations, duplicate slots, disabled live publishing/spending, file validation/expiry, shared-mode passwords/origin protection, queue simulation idempotency/reconciliation/pause/cancellation and actual server restart persistence.

An optional end-to-end test uses an existing Playwright installation and Chromium:

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs npm run test:browser
```

Set `CHROMIUM_PATH` if needed. This is a development-only tool; no browser dependency is needed to run the app. It checks all main screens, audience/campaign creation, four-platform drafting, parameter-preserving tracking links, the queue simulation, the full manual review → revise → approve → prepare → fictional publication-record flow, inquiry/metric entry and a 390px mobile layout, asserting no browser errors. It saves screenshots to `/tmp/cstc-dashboard.png` and `/tmp/cstc-mobile.png`. It never opens a social platform, sends content, launches ads or spends money. Local sandbox runners may need permission to bind test ports and launch Chromium.

## Architecture, data and recovery

- `server.mjs`: HTTP/static server, password/session handling, SQLite persistence, permissions, content checks, workflow, upload validation and audit events.
- `seed.mjs`: verified website fact register, provisional requirements, illustrative campaigns/audiences, blank inquiry/results/asset stores.
- `publishing-simulation.mjs`: network-free durable queue transition logic for demonstration only.
- `public/`: dependency-free browser UI. No credentials, team data or production media are stored in localStorage or IndexedDB.
- `test/`: isolated HTTP integration tests and optional browser workflow.

`data/studio.sqlite` stores one workspace JSON document, users with salted scrypt password hashes, persistent expiring sessions and the mode marker. SQLite WAL makes single-process updates durable; draft revision numbers prevent stale overwrite. The single Node event loop performs each mutation synchronously after request-body parsing. **Do not run multiple server processes against this document model.** Scale-out requires normalized records/transactions, coordinated jobs and external object storage.

`data/media/` contains random server-assigned filenames; authenticated requests check the asset registry before reading a file. Data directories use private permissions. Production media is outside browser storage and must be on a persistent volume. The current 10 MB upload limit is an application limit, not a claim about platform limits. File signatures are checked; this is not malware scanning or full media decoding. Use a scanner/transcoder and managed private object storage before accepting untrusted uploads at scale.

API mutations require a session and enforce roles on the server. Sessions use HttpOnly, SameSite=Strict cookies and eight-hour expiry; shared HTTPS mode adds Secure. JSON-only mutation requests and browser-origin checks mitigate CSRF. Login attempts are throttled per process/IP. Team disablement and password resets revoke sessions. Security headers include CSP and no-sniff; exports escape spreadsheet formulas. No social tokens or passwords are requested; there are no live external adapters or outbound publishing requests.

For backup, stop the server cleanly, copy the entire private `DATA_DIR` (database and media together), and restart. To restore, stop the server, restore that complete directory, and start in its original mode. Restore a backup to recover missing assets. Revoke restored sessions before reuse: with the server stopped and an authorized SQLite console, run `DELETE FROM sessions`. Protect backups as customer data. For a lost administrator password, an authorized operator can restore an access-controlled backup or update the administrator’s salt/hash using the same `scryptSync(password, salt, 64)` format offline; revoke all sessions afterward. No unauthenticated reset endpoint is exposed. Record operational actions outside the stopped application.

## Research and repository notes

Website review date: **2026-11-24**. Sources: [Home](https://www.cstcsafety.com/), [Written Programs](https://www.cstcsafety.com/written-programs), [Online Courses](https://www.cstcsafety.com/online-courses), [Our Staff](https://www.cstcsafety.com/our-staff), [Contact/location](https://www.cstcsafety.com/contact). The source register is editable in Brand profile. Official social profiles, logo and colors were not verified and are not fabricated. No certifications, pricing, customer relationships, testimonials, guarantees or regulatory compliance claims are generated.

The repository was fetched and inspected before implementation. Only root `AGENTS.md` existed; no social-studio sample or other app was present to reuse. This app lives at the requested `apps/social-studio/`. Follow root collaboration instructions: fetch and safely integrate shared changes, test, commit, fetch again before pushing, and never force-push.
