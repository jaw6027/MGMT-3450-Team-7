# Integration readiness and requirements

All live integrations are **unimplemented and disabled**. The app cannot publish or spend by changing an environment variable, browser flag or administrator setting. Do not describe the demonstration queue as a working publishing integration.

## Official publishing references

These links are setup references, not a claim that their current contents or account-specific requirements have already been reviewed. Administrator-reviewed requirement fields start blank and block readiness. Confirm current documentation, eligible account types, permissions, formats, quotas and terms before writing or enabling adapters.

| Platform | Official starting point | Required account-specific investigation |
| --- | --- | --- |
| Instagram | https://developers.facebook.com/docs/instagram-platform/content-publishing/ | Supported professional account/login path, account linkage, OAuth scopes, app review/access level, supported media/containers, processing, rate limits and returned publication identifiers. |
| Facebook | https://developers.facebook.com/docs/pages-api/posts/ | Eligible Page and Page access, required access token/scopes, app access review, text/media/video differences, token expiry and Page restrictions. |
| TikTok | https://developers.tiktok.com/doc/content-posting-api-get-started | App registration/audit, eligible user/account, approved scopes, creator capabilities/privacy selection, upload vs direct-post flow, quotas and status polling. |
| LinkedIn | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api | Member vs organization authorization, product/API access, current scopes, organization role, version headers, media registration, document/video support and access approval. |

Do not ask for social account passwords. Use official OAuth consent. No scopes are preselected or represented as granted in this app.

## Remaining engineering before Stage 2 is operational

1. Register developer apps, obtain authorized test/production accounts and approved API access. Supply client IDs, server-held client secrets, approved HTTPS callback URLs and least-privilege scopes using a secret manager. External account owners must grant consent and any required app review must complete.
2. Implement server OAuth start/callback routes with expiring one-time state, PKCE where supported, exact redirect URI validation and authorized administrator-only connection management. Encrypt tokens at rest using a managed encryption key. Never return tokens in state, logs or exports.
3. Record actual capabilities, account IDs, connection health, token/scopes expiry and revocation status. Add reconnect and revoke flows. Display exact permission and format limitations for each account from real API responses/documentation.
4. Implement and test each platform adapter: upload validation/processing, content submission, polling and reconciliation, returned platform IDs/URLs and definitive errors. Add read-only reporting adapters and preserve platform definitions and missing values.
5. Replace the manually stepped simulation runner with a durable background worker and transactional job claiming/leases. Preserve revision-based idempotency and check administrator enablement, connection eligibility, approval/version, preflight, due instant, pause and cancellation immediately before submission. A content edit removes the job from active execution. Reconcile a request with unknown outcome before retrying; never blindly retry publication.
6. Persist platform callbacks/polling evidence and mark Published only on an actual platform confirmation. Use distinct queued, processing, failed and uncertain states. Add failure alerts and background notifications with a configured sender/worker. Test worker crash recovery and uncertain network outcomes with sandbox/mock adapters before any authorized real use.
7. Add administrator enablement and authorized publisher scheduling only after the above passes. Keep manual preparation available. Require an explicit real-use authorization before a test submits any public content. Development tests in this repository have no such authorization.

The SQLite-persisted simulation currently tests identity/revision idempotency, pause, attempts, cancellation, definite failure retry and uncertain reconciliation. It is deliberately network-free, has no timer worker, and does not assert production exactly-once delivery. Multiple workers/distributed locks, encrypted token persistence and platform reconciliation remain engineering work; missing credentials are not the only blocker.

## Stage 3: live advertising

Planning/export and a proposed authorization summary work now. The displayed account, audience, creative, currency, dates, budget, reviewer and separate budget approver do not authorize any spend. No budget approval or launch endpoint exists.

Operational advertising additionally requires authorized ad accounts/billing, supported official ad APIs, ad-management permissions and review, a separate immutable budget authorization tied to the exact account/audience/creative/dates/currency/limits, and server-side separation from organic content approval. Implement account/workspace budget controls, duplicate launch prevention, end dates, periodic actual-spend ingestion, alerts and auditable pause requests. Record a pause as confirmed only after the platform confirms it. Reporting delays and platform execution behavior mean app-side limits cannot guarantee an immediate stop. Do not enable spending or launch development ads without separate explicit spending authorization.

## Other optional connections

Email/background reminders need a configured sender, delivery provider, opted-in recipient preferences and a durable notification worker. Website conversion attribution requires an authorized analytics/form source and consent-aware mapping. Calls, mail, DMs and website forms are not automatically collected; keep manual labels until a working source produces evidence. Imports and integration-confirmed inquiries must retain source and ingestion timestamp. No source is currently configured.
