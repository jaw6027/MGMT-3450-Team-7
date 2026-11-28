# Inspection system architecture

The new entry point is `server.mjs` and `public/`. Node.js 24 supplies HTTP, cryptography and SQLite; no runtime packages or remote scripts are needed. The original customer experience (`prototype.fragment.html` → generated `index.html`) is preserved at `/prototype/`. Social Studio remains independent.

## Data and request boundary

`model.mjs` defines validation, tenancy, deterministic summaries and reminder derivation. `server.mjs` owns authentication, server authorization, transactions, uploads and routes. `public/app.js` presents the workflow and sends JSON mutations; it never acts as the security boundary. `public/style.css` provides responsive layouts, keyboard focus and labels paired with status colors.

SQLite stores organizations, users, hashed sessions, business records, attachment metadata and an append-only application audit table. Each record has a kind, organization, property, creator/editor, timestamps and an integer version. JSON holds kind-specific data. Every business mutation uses an immediate transaction; version checks return HTTP 409 rather than silently overwrite another teammate’s changes. The API is intentionally not a generic JSON record editor: each workflow action has a whitelist and state/role checks. Administrators with direct database access remain trusted operators; this is not a tamper-proof regulatory archive.

Files are stored outside the browser in a private server directory with random storage names, checksums and metadata. API access checks authentication, organization, property and release status. Customer downloads of staff reports require review, except explicitly reviewed finding-source material. Reviewed historical report versions remain available after new revisions. Correction uploads owned by another customer become available to permitted property members after evidence submission (staff can inspect property uploads). Draft notes remain private to their author. PDF, PNG, JPEG and WebP signatures and 10 MB limits are checked. Files are served as attachments; inline rendering is limited to images. **Malware scanning is not configured.**

## Core records

| Record | Purpose and links |
| --- | --- |
| Organization / site | Customer segment, property, contacts, jurisdiction, source/requirement scope |
| Inspection | Schedule with absolute instant + IANA time zone, coordinator, verified/unverified inspector identity, confirmation, preparation tasks/owners/deadlines, guide, report versions |
| Re-inspection | Inspection subtype linked to completed original inspection and specific findings at the same property |
| Guide | Property, applicable type, owner, source, instructions, approval/revision history in audit; edits reset approval |
| Finding | Immutable original description, severity/source classification, location, citation, original deadline, source document; mutable workflow separate |
| Draft / evidence | Private recoverable correction draft; immutable submission versions with notes, photos/files and independent review |
| Extension / acceptance / dispute | Documentary subrecords on finding; original deadline retained; disputes never suspend it; external acceptance labeled staff-recorded |
| Project / permit | Job scope, jurisdiction, applicability rationale, official source, application vs issued evidence, conditions and expiry |
| Task | Qualified corrective vs preventive action, root cause, owner, deadline, recurrence and previous-task link |
| Credential | Issuer, source, recorded expiry, owner and qualified source review; no credential validity guarantee |
| Message | Tenant/property conversation, optional inspection/finding/project link, actor/time on each reply |

## Permissions

Membership scopes every record and file. Empty property membership means all properties inside assigned organizations; explicit IDs restrict access further. Only administrators can have global organization access. Staff assigned to several organizations still need membership in each. Customer conversations are visible to permitted members of that property, not private one-to-one mail.

| Role | Actions |
| --- | --- |
| Customer | View permitted released records, confirm appointments, complete preparation, submit own assigned corrections, inquire, add credential dates pending review |
| Customer Manager | Customer actions plus property edits, correction assignment, preparation assignment, project planning and task completion within membership |
| Coordinator | Schedule visits, add property/guide/permit drafts, upload reports and reply; cannot verify findings or approve guides |
| Inspector | Staff actions; creating findings and technical approval additionally require the explicit qualified designation |
| Qualified Inspector | Review reports/guides/evidence, document extensions and authority acceptance, review permit/credential sources, record closure and prevention |
| Administrator | Provision organizations/users, scope memberships and qualification at creation, disable/re-enable and reset credentials; inspector approval still requires Inspector role and qualification |

A reviewer cannot approve their own submitted correction evidence. Closure requires internal evidence verification, an accepted reviewed linked re-inspection when required, and documentary authority acceptance when required. Official citations always require documentary authority acceptance. Neither a checklist, task completion nor photo upload closes a citation.

## Authentication and shared mode

Default demonstration mode has conspicuous simulated identity selection and fictional seed records. It is inappropriate for real customer information. Shared mode disables selection and requires individual username/password sign-in (salted scrypt), random HttpOnly SameSite=Strict session cookies, hashed server session tokens and eight-hour expiry. Disabling/resetting a user revokes sessions. No SSO, MFA, password recovery email or public self-registration is provided. Add a second administrator before changing administrator access; self-access changes are blocked. To change an existing member’s role/scope, provision a replacement account and disable the old one; in-place role editing is not implemented.

Use HTTPS and secure cookies in shared operation. JSON-only same-origin mutation checks, prepared statements, restricted static routes, a self-only script policy and escaped UI values reduce common web risks. Configure proxy trust, TLS, rate limits and operational monitoring for your host. Do not place credentials in URLs, source control or customer records.

## Reminders, schedules and metrics

Reminders derive from current inspection schedules, preparation deadlines, finding extensions, issued-permit expiry, credential renewals and open tasks. Cancellation/completion removes the relevant active target. Each person can save a 7/14/30/60/90-day advance window; later reminders remain visible and explicitly labeled. Browser refresh is every minute when no form/dialog is active. **Delivery is in-app while open only**: no emails, SMS, push notifications, background queue or agency submissions are configured.

Schedules retain an absolute timestamp and explicit IANA zone. The form rejects nonexistent wall times and asks for first/second occurrence during a repeated daylight-saving hour. Dates without a time are evaluated in each record’s zone. A customer confirmation records acknowledgment, not a passing outcome.

Metrics use actual scoped database records, including clearly labeled samples in demo mode. Finding workload: pending = Open/Assigned, active = other non-closed states, complete = Closed. Timing medians omit missing/invalid pairs and show “Not recorded” when absent; zero remains zero. Definitions and CSV export appear in the app. Date filters select records by creation date in America/Los_Angeles; upcoming windows use current time within that cohort. Similar-category flags are candidates for review, not verified repeat violations or a risk/compliance score.

## Remaining work and boundaries

This is a functioning, persistent manual inspection core suitable for controlled evaluation. It is not a claim that the entire design brief is production-complete. Remaining work includes customer notification channels/escalation/background delivery; formal source freshness policies and severity taxonomy; richer configurable inspection checklists; external agency/permit-system integration; a validated rules library; advanced archive/date/type facets; enterprise identity and account recovery; offline capture/synchronization; antivirus scanning, retention and managed object storage at scale; independent security/accessibility review; and real verified company branding/service/source material. No public deployment, regulatory filing, real notification or payment occurs in development.

Invoices, prospect intake, service-request lifecycle and other original business tools remain the explicitly labeled browser-memory prototype. They are preserved, not represented as shared backend modules. New Messages is real authenticated property-scoped portal storage, with no external delivery or unauthenticated prospect intake.
