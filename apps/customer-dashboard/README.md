# CSTC Customer Dashboard · design prototype

This folder saves the customer-dashboard prompt and the interactive design reviewed in chat. **It is a prototype, not a production customer portal.** The existing Social Studio application is separate and unchanged.

## Open the saved preview

Download this folder and open **index.html** in a modern browser. GitHub's file view displays source code, not the interactive page. Alternatively, from this folder run:

```bash
python3 -m http.server 3001 --bind 0.0.0.0
```

On the same computer, open `http://localhost:3001`. A browser on a different device needs an authorized hosted preview or other configured connection; `localhost` on an iPad refers to the iPad. No public deployment is included.

The export includes its display shell and uses pinned external helpers/icons from unpkg.com. The core dashboard interactions also work when those optional network resources are unavailable. The wrapper isolates the preview in a sandboxed frame; browser settings can limit opening external resource links. Resource addresses are visible in the editable source and require verification before operational use.

## Included work

- [PROMPT.md](PROMPT.md): the complete customer-dashboard build prompt, including proposed customer segments, data requirements, security and delivery expectations.
- [prototype.fragment.html](prototype.fragment.html): editable source for the reviewed design.
- [index.html](index.html): standalone export of the interactive preview.
- [scripts/build.py](scripts/build.py): refreshes the editable fragment inside the exported shell without requiring the original chat environment.
- [test/preview.mjs](test/preview.mjs): optional browser checks for both the source and standalone export.

The preview lets you switch between **commercial**, **municipal**, and **business partner** experiences. It includes a **Message Center** for prospect and current-client inquiries, incident alert details and local acknowledgment, preparedness checkboxes, sample assistance requests, a deadline calendar, response measures/benchmark placeholders, community-resource references, and color labels. The Message Center has relationship filters, conversation threads, sample replies from either side, owner/follow-up editing, and New / In progress / Awaiting client / Closed states. An **Invoice Due Dates** section shows overdue, due-today, upcoming (next 30 days), future, paid and missing-date sample records. You can change the illustrative as-of date, filter statuses, add/edit local sample records and demonstrate a paid record. Amounts are fictional invoice amounts, not CSTC pricing or confirmed balances. No outgoing notifications, charges or accounting updates occur. It supports narrow mobile layouts and light/dark appearance.

All customer organizations, assignments, records, metrics and targets are **illustrative**. The proposed segments are not assertions about actual CSTC customers. Brand styling is provisional. Sample deadlines are internal planning targets, not verified legal obligations. The calendar starts in an illustrative December 2026, supports other months, and links to the sample appointment/renewal records. Response figures are calculated from illustrative manual request timestamps. National resource links are proposed references; no availability or local applicability check is claimed.

## Feature-list implementation status

| Feature | Working prototype behavior | Still needed for production |
| --- | --- | --- |
| Request-status chart | Pending/Active/Completed totals and count bars derive from local request records; status and date filters update them. | Authenticated shared requests, server permissions and audit history. |
| Message Center | Local inquiry threads, prospect/current-client labels, owners, replies and follow-up. | Secure private intake, persistent conversations, authorized recipients and delivery integrations. |
| Training/service calendar | Month/category filters show training, service visits, inspections, consultations and renewals from linked reminder records, alongside internal targets. | Shared booking data, permissions, concurrency and scheduling services. |
| Deadline reminders | Appointment and credential tracking, owner, lead times, timezone, source review, lifecycle and customer-facing message preview. | Persisted verified requirements, consent, durable background scheduling and notification providers. |
| Invoice tracking | Upcoming, due-today, overdue, paid and missing-date local invoice monitoring. | Authorized accounting records, settlement confirmation and billing integrations. |
| Document center | Customer preview shows only approved, unrestricted, unexpired sample metadata; edits reset approval; staff preview supports sample review. | Server-enforced permissions, actual private files, validation/scanning, verified approvals and access audit. |
| Customer/site profiles | Editable fictional organization/site contacts and needs, with local service history. | Persistent authorized customer records and privacy controls. |
| Response-time metrics | Separate medians for acknowledgment, first response and resolution from available manual sample timestamps; date filters, denominators and chronology checks. | Actual event sources, policy for business hours and verified service targets/benchmarks. |
| Customer feedback | Sample post-service ratings, comments, unresolved concerns, assigned follow-up and status tracking. | Secure customer-specific survey collection, delivery and persistent follow-up. |
| Renewal/inquiry tracking | Local renewal source/expiry tracking and prospect/current-client inquiry follow-up. | Verified customer requirements, account relationships and operational notifications. |

### Appointment and credential reminders

**Appointments & renewals** has an illustrative as-of date, appointment/renewal filters, upcoming/due-today/overdue or follow-up states and assigned owners. Add/edit sample records, choose local appointment times and IANA zones, set reminder targets (30/7/1 days or day-of), and preview the customer message. Nonexistent local times during spring clock changes are rejected; repeated fall times require an explicit first/second occurrence. A past appointment is flagged for follow-up, not automatically declared missed.

Credential dates require a relevant issuer, applicability/source review and expiry evidence before any active sample target is displayed. Unverified or missing dates are flagged. Closing a reminder stops its sample targets; it does not certify legal compliance or the validity of a replacement credential. Email/SMS preferences are visibly **not configured**, and no messages or jobs are actually scheduled. Local reminders display when you open or change the view; no live clock, background timer, email/SMS sender or push notification service is running.

Sample response times are median elapsed clock minutes, with no business-hour exclusions. Each metric excludes records missing either required timestamp and shows its own denominator. A measured zero-minute interval is retained. Staff can record explicit-offset sample timestamps; invalid chronology is rejected. Supplying a resolution timestamp marks the local sample request Completed. The source is illustrative/manual; no actual CSTC service performance is claimed.

[Request metrics screenshot](docs/requests-preview.png) · [Reminders screenshot](docs/reminders-preview.png)

## Important behavior and remaining work

Interactions change the local preview only. The export may remember the selected customer experience through its browser-side display wrapper. Sample requests, inquiries, replies, assignments, invoice edits, reminders, document records, profiles, feedback, acknowledgments and checklist changes reset on reload. Nothing is sent to CSTC, GitHub or emergency services. Do not enter real personal, medical or confidential information.

Message Center relationships (prospect/current client) are separate from the proposed customer segments. Sample contact information remains only in the active preview memory and is not included in the saved display preferences. Clients in a real deployment must see only their permitted conversations; the preview's shared list does not enforce this. No email, SMS, notification or delivery/read receipt is sent or claimed.

Invoice dates use a fixed illustrative as-of date (December 8, 2026) until changed in the preview. This is not a live aging report. Paid demo records are excluded from overdue counts. Invoice access in production must be limited to authorized billing staff and the relevant current client; the prototype does not enforce billing permissions. There is no invoice issuance, accounting integration, payment processing, collection or reminder delivery.

There is **no production authentication, customer isolation, backend database, incident feed, emergency dispatch, notification delivery, SLA measurement, compliance verification or operational document storage** in this prototype. Customer switching demonstrates proposed layouts, not authorization. Completing a task or acknowledging an alert does not certify safety or resolve an incident. Missing results and benchmarks are labeled unavailable.

The production app described in PROMPT.md still needs implementation: authenticated roles and organization/site/record access checks, persisted reminder/appointment/customer/request/document/feedback data and media, audit history, verified company/customer facts and emergency contacts, source-backed deadlines, actual timestamp-based calculations, configured monitoring/notifications and integrations, and deployment/recovery procedures. No deployment, real request, social post or advertising spend was performed while saving this work.

## Edit and validate

Edit `prototype.fragment.html`, then refresh its exported copy:

```bash
npm run build
npm run check
```

Python 3 is required for the build/check script. Node.js 20+ is required for the optional browser checks. There are no runtime package dependencies.

For the browser test, use an existing Playwright installation and Chromium:

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_PATH=/absolute/path/to/chromium npm run test:browser
```

If Playwright is installed in the normal Node resolution path, omit `PLAYWRIGHT_MODULE`. `CHROMIUM_PATH` defaults to `/usr/bin/chromium`. The test blocks external network requests, never submits a real request, and writes no customer records. It checks customer switching, alert acknowledgment, preparedness tasks, local request creation, prospect/current-client inquiry creation and filters, reply threads, ownership/follow-up, closing/reopening, text escaping, invoice status/date classification, invoice editing and paid-record exclusion, request metric updates, reminder source review/notification blockers, daylight-saving ambiguity, document approval restrictions, customer/site edits, feedback follow-up, timestamp-derived medians, linked calendar details and layouts at 1024, 768, 390 and 320 pixels, using the actual standalone export as well as the editable source.

The original export was produced with the visualization renderer. The build script preserves that shell and replaces exactly the marked source fragment. It refuses ambiguous replacements. Shell or external-helper upgrades require a new reviewed export.
