# MGMT 3450 · Team 7

## Preview both apps on your own computer

Install **Node.js 24 or later** from [nodejs.org](https://nodejs.org/en/download). Download and unzip this repository, open Terminal in the repository folder, and run:

```bash
node scripts/preview-apps.mjs
```

Keep that Terminal window open, then open these addresses in a browser **on that same computer**:

- **Social Studio:** http://127.0.0.1:3000 — choose **Open demonstration**.
- **Customer Dashboard:** http://127.0.0.1:3001 — choose a demonstration identity to open the inspection workspace; original business tools remain at `/prototype/`.

No package installation is needed. Both previews bind to the local computer. Both apps use separate, ignored server demo data directories. The Customer Dashboard now includes a persistent inspection system; its original general business tools remain an illustrative browser prototype. No real social posts, inquiries, invoices, reminders or payments are sent. Press **Control+C** in Terminal to stop both. If a port is busy, stop the existing preview or set unused `SOCIAL_PORT` and `CUSTOMER_PORT` values. `PREVIEW_DATA_DIR` selects Social Studio demo data and `CUSTOMER_DATA_DIR` selects Customer Dashboard demo data; never point either at shared/production data.

These local addresses work on the computer running the command. A server running in Codex Cloud needs a configured HTTP preview or forwarding connection before a browser on your Mac can reach it.

Launcher checks: `node --test scripts/preview-apps.test.mjs`.

## CSTC Social Studio

The social marketing workspace is in [apps/social-studio](apps/social-studio/README.md).

```bash
cd apps/social-studio
npm start
```

Requires Node.js 24+. Open http://localhost:3000. The default is a clearly labeled demonstration with persistent server data and simulated identities. Manual posting is the default; live automatic publishing and paid advertising are disabled.

See the app README for authenticated shared-mode setup, the manual workflow, tests, feature status, security and recovery. See [integration requirements](apps/social-studio/INTEGRATIONS.md) for blocked live capabilities. Follow [AGENTS.md](AGENTS.md) for shared repository collaboration.

## CSTC Customer Dashboard · inspection system

The [customer dashboard](apps/customer-dashboard/README.md) now includes a persistent inspection and compliance core: property status, inspection/re-inspection calendar, preparation guides, immutable findings/citations, correction drafts and uploads, independent verification, documentary acceptance, report history, permits, renewal reminders, preventive follow-ups, portal messages and tracking metrics. Shared mode uses individual passwords with server-enforced organization/property permissions. The default is a clearly labeled simulation with fictional records.

The original browser prototype remains at `/prototype/`, preserving message/invoice/request/calendar/customer-feedback demonstrations. Those original tools are not shared backend features. Email/SMS delivery, offline synchronization and agency integrations are not configured; no filings or payments occur. Follow the app README for startup, shared-mode security, tests, backup and the precise implementation status.
