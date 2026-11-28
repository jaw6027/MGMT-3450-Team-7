# MGMT 3450 · Team 7

## Preview both apps on your own computer

Install **Node.js 24 or later** from [nodejs.org](https://nodejs.org/en/download). Download and unzip this repository, open Terminal in the repository folder, and run:

```bash
node scripts/preview-apps.mjs
```

Keep that Terminal window open, then open these addresses in a browser **on that same computer**:

- **Social Studio:** http://127.0.0.1:3000 — choose **Open demonstration**.
- **Customer Dashboard:** http://127.0.0.1:3001 — includes Message Center and Invoice Due Dates.

No package installation is needed. Both previews bind to the local computer. The Social Studio uses its separate, ignored demo data directory; the Customer Dashboard remains an illustrative browser prototype. No real social posts, inquiries, invoices, reminders or payments are sent. Press **Control+C** in Terminal to stop both. If a port is busy, stop the existing preview or set unused `SOCIAL_PORT` and `CUSTOMER_PORT` values. `PREVIEW_DATA_DIR` can choose a separate demo data directory; never point it at production data.

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

## CSTC Customer Dashboard · preview

The [customer-dashboard prototype](apps/customer-dashboard/README.md) includes the completed build prompt and interactive design preview for commercial, municipal and partner experiences, plus a Message Center for prospect and current-client inquiries and an Invoice Due Dates monitor. Open the downloaded `apps/customer-dashboard/index.html` in a browser to explore it. This is an illustrative prototype; production authentication, shared customer data, alerts and service integrations still need implementation. See the [build prompt](apps/customer-dashboard/PROMPT.md) for the intended production requirements.
