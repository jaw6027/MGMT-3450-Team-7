# CSTC Customer Dashboard

A persistent manual inspection and compliance workspace now runs at the app root. The existing business dashboard prototype remains available at `/prototype/`; its message/invoice/calendar demonstrations are preserved.

## Start locally

Requires **Node.js 24+** (built-in SQLite). No package installation is needed.

```bash
cd apps/customer-dashboard
npm start
```

Open **http://localhost:3001 on the same computer running the server**, then select a clearly labeled demonstration identity. Default sample records are fictional; changes persist in ignored `data/customer.sqlite` and `data/files/`. Choose Jordan to try the customer workflow, Sam for qualified inspection review, Casey for coordination, and Alex for administration. Taylor demonstrates a separate customer organization. Identity switching is simulated, not production authentication.

To start this app and Social Studio together, run `node scripts/preview-apps.mjs` from the repository root. Both bind to your computer. A server running in Codex Cloud requires a configured forwarding/HTTP preview before its local address can work on a Mac or iPad. Nothing here deploys publicly.

## Working inspection features

- Organization/property overview with reviewed critical findings first, overdue dates, missing records, upcoming visits and pending verification. Status is evidence-scoped, never a guarantee of legal compliance.
- Persistent property profiles, customer segments and server-enforced organization/property membership.
- Inspection and re-inspection calendar/list, search, status/type/coordinator/date filters, explicit time zones, daylight-saving ambiguity checks, customer confirmation and preparation owners/milestones.
- Source-backed preparation guides with qualified approval and automatic approval invalidation on edits.
- Immutable original findings/citations, separate severity and lateness, source documents, inspector notes/photos, assigned corrections and original/extended deadlines.
- Recoverable server-side correction drafts, real file uploads/downloads, multiple evidence submissions, requests for more evidence and independent verification. Reviewers cannot verify their own correction submissions.
- Linked re-inspections, documentary external acceptance, gated closure, reopen reasons and disputes that never suspend deadlines automatically.
- Searchable report archive with reviewed and pending versions retained; customers cannot download unreviewed staff reports. Historical approved versions remain available.
- Project/permit applicability review, application vs issued status, documentary permits, conditions and expiry reminders. No application status authorizes work.
- Reviewed corrective/preventive tasks, root-cause notes, assigned due dates and monthly/quarterly/annual follow-ups. Completing a recurring task creates one successor; duplicate completion is blocked.
- Credential renewal source review, portal messages tied to properties and optionally inspections/findings/projects, actual in-app deadline reminders with a persistent personal advance window.
- Workload chart, timing metrics, creation-date/property filters, missing values distinct from zero, definitions and CSV export.
- Shared-mode individual password sign-in, session revocation, administrator provisioning, scoped server permissions, optimistic conflict protection and transactional audit history.
- Mobile navigation, accessible form labels, keyboard focus/dialog handling, text status labels, safe file handling and clear save/error feedback.

The app does **not** automatically verify legal requirements, current URLs, authority decisions, permits, credentials or CSTC business claims. Use reviewed real sources and qualified personnel. Branding is provisional. No real client records are seeded.

## Try the complete manual workflow

1. Open the demonstration as Jordan; select Sample facility A. Review the illustrative critical finding and its next action.
2. Open Inspections & visits. Review scope and guide, complete preparation tasks and confirm the appointment.
3. Switch to Casey or Sam to attach the completed inspection report. Sam reviews it. Jordan can then download the released report.
4. Sam records source-backed findings. Official citations require the citation reference, authority, jurisdiction, original document, source confirmation and agency/regulatory deadline.
5. Jordan starts the assigned correction, opens **Submit proof of correction**, adds notes/photos and saves a draft. Reload and reopen to recover it; submit for review.
6. Sam requests more evidence. Jordan submits a new version. Sam independently approves the correction.
7. If required, Casey schedules a linked re-inspection after the original inspection is complete; Sam reviews its report and records the accepted outcome. Sam records required authority acceptance from documentary evidence. No agency API is implied.
8. Sam selects **Verify closure requirements**. The server blocks closure until all required checks pass. Add reviewed preventive follow-up and track future obligations.
9. Use Messages for a property inquiry; review reminders and metrics. Switch to Taylor to confirm the other customer cannot see these records.

## Shared authenticated mode

Use a **separate empty data directory**; demo/shared modes cannot share a database. Set the following environment variables in your server’s secure configuration (do not commit secrets):

| Variable | Meaning |
| --- | --- |
| `CUSTOMER_DEMO_MODE=false` | Disables simulated identities and illustrative seeding |
| `CUSTOMER_DATA_DIR` | Absolute private directory for database and media |
| `CUSTOMER_ADMIN_PASSWORD` | At least 14 characters; initializes username `admin` on first shared startup |
| `CUSTOMER_COOKIE_SECURE=true` | Required when serving through HTTPS; leave false only for local HTTP testing |
| `CUSTOMER_PUBLIC_ORIGIN` | Exact HTTPS origin when behind a reverse proxy; e.g. your private configured host |
| `CUSTOMER_HOST` / `CUSTOMER_PORT` | Bind address/port; defaults `0.0.0.0:3001` for direct startup |

Start `node server.mjs` after setting these values. Sign in as `admin`, create organizations/properties and provision individual members. Only Inspector-role members with an explicit qualified designation can approve technical records. Administrators are not automatically qualified inspectors in shared mode. Create a second administrator for access recovery. Roles/scopes are selected on account creation; replacing and disabling an account is currently required to change them. There is no self-service password recovery, SSO or MFA.

Before real customer use, configure TLS, private access, file scanning, host monitoring, backup/retention and verified source material; conduct an independent security/accessibility review. Do not expose demo mode to real customer information.

## What remains external or prototype-only

Email/SMS/push and background reminder delivery are **not configured**. Reminders recalculate in-app; the page refreshes once a minute when no form is active. No messages are emailed. There is no agency filing, automatic permit validation, external rules library or automatic legal compliance assessment. Offline saves/synchronization are not implemented; save a server draft while connected. Malware scanning and managed cloud object storage are not configured.

Original invoices, anonymous prospect intake, service-request metrics, customer feedback and other general business modules remain a labeled **browser-memory prototype** at `/prototype/`. Those changes do not persist to the shared inspection database. The new inspection Message Center stores authenticated property conversations, not unsolicited prospect intake. See [architecture and remaining work](ARCHITECTURE.md) for precise boundaries and the [design brief](INSPECTION-COMPLIANCE-PROMPT.md) for the broader target.

## Tests

```bash
npm run check
npm test
npm run test:inspection-browser
```

The browser test requires Playwright and Chromium already installed; set `PLAYWRIGHT_MODULE` to the Playwright module path and `CHROMIUM_PATH` if needed. `npm run test:browser` validates the preserved original prototype. The new browser test covers role switching, appointment preparation/confirmation, correction drafts/files, revisions, independent approval/closure, time-zone/DST validation, report release, calendar, messages, export and mobile layout. API tests cover tenant/property isolation, immutable sources, file release, self-review, stale versions, credential/permit boundaries, session revocation, recurring task duplication and full server-restart recovery. Tests use temporary directories and ephemeral local ports; no notifications, regulatory filings, social posts or payments are sent.

From the repository root also run `node --test scripts/preview-apps.test.mjs` for the dual launcher. Node’s built-in SQLite may display an experimental warning on some Node 24 versions.

## Backup and recovery

Stop the app cleanly, then back up the **entire private data directory**, including database and files, to encrypted access-controlled storage. Never copy just the SQLite file while it is running in WAL mode. Restore the full directory to a compatible Node 24+ host with the same demo/shared mode and private permissions, then sign in and verify a report download and saved record. Keep secrets separate from backups; rotate passwords/revoke sessions after an incident. No schema version migration is needed for existing customer prototypes because they had no shared database; new SQLite tables initialize on startup.

To reset demonstration data, stop the app and move its demo data directory aside; restart to seed a fresh demonstration. Never do this with shared customer data. Preserve backups and use your organization’s retention requirements.

## Files and screen guide

- [Architecture / data model / permissions / limitations](ARCHITECTURE.md)
- [Screen annotations and screenshots](docs/INSPECTION-SCREENS.md)
- `server.mjs` — backend and security boundary; `model.mjs` — validation and summaries.
- `public/` — new responsive inspection interface.
- `prototype.fragment.html` — original prototype source; `index.html` — generated original export; `python3 scripts/build.py --check` verifies they match. Do not replace the export manually.
