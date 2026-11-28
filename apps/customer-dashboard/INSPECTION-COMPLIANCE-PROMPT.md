# Customer-facing inspection and compliance dashboard design prompt

Design a **customer-facing inspection and compliance dashboard for CSTC Safety** that gives customers an immediate, understandable view of safety obligations, inspection findings, and required actions across all their facilities and properties.

Approach the design from the perspective of an experienced inspection and compliance operations professional. Prioritize **upcoming inspections, re-inspection dates, preparation guides, past reports, cited violations, correction deadlines, and proof of correction**.

The dashboard should help customers take the right action between inspections, rather than simply display reports and charts.

Verify CSTC’s actual services before describing them. Do not imply that CSTC is a government enforcement agency, permit authority, or credential issuer unless verified. Clearly distinguish official citations and agency decisions from consultant observations, internal findings, and recommendations.

## 1. Facility and property organization

Support organizations with multiple facilities, buildings, properties, job sites, and projects.

For each property, record:

- Name, address, jurisdiction, property type, and responsible contacts.
- Relevant inspection types and applicable requirements.
- Upcoming inspections and re-inspections.
- Open findings, corrective actions, and deadlines.
- Required permits and their recorded status.
- Current and historical reports, supporting documents, and preparation guides.

Provide an organization-wide overview and a clear property selector. Customers must always know which organization, property, and reporting period they are viewing.

## 2. Immediate compliance overview

The first screen must prioritize:

1. Critical unresolved safety findings.
2. Overdue corrective actions and hard deadlines.
3. Upcoming inspections and re-inspections.
4. Corrections awaiting verification.
5. Missing information that prevents a reliable status assessment.

Show an evidence-based status for each property, such as:

- **Critical action required:** A reviewed critical finding remains unresolved.
- **Action needed:** Open findings, overdue obligations, or required next steps exist.
- **Awaiting verification:** Evidence has been submitted but acceptance is pending.
- **No open findings in reviewed records:** Reviewed records show no outstanding findings within the stated scope.
- **Unknown or incomplete:** Required records are missing, outdated, or unverified.

Explain the status calculation and show its scope, source, last review date, and responsible reviewer. Do not present a property as “fully compliant” merely because a checklist is complete or no findings have been entered.

## 3. Home-screen layout and urgency

Organize the home screen in this order:

- **Header:** Organization/property selector, search, notifications, and last-updated information.
- **Critical-action area:** A prominent notice when reviewed critical findings exist, with the affected property and a clear next action.
- **Summary cards:** Critical open findings, overdue corrective actions, upcoming inspections, and pending verification.
- **Prioritized action list:** The largest section of the screen.
- **Upcoming schedule:** Inspections, re-inspections, renewal dates, and preparation milestones.
- **Recent reports and documents:** Quick access to the latest relevant records.
- **Secondary tools:** Messages, permits, preventive recommendations, and supporting business functions.

Every action-list item should show the finding or obligation, property, severity, workflow status, owner, deadline, latest update, and next action.

Keep **severity separate from lateness**. An overdue administrative task must not automatically outrank an unresolved critical safety hazard.

## 4. Inspection and re-inspection tracking

Provide calendar and list views with filters for property, inspection type, inspector, status, and date range.

Each inspection record should contain:

- Inspection type, scope, property, and relevant areas.
- Scheduled date, time, explicit time zone, and appointment status.
- Inspector or inspection organization, when verified.
- Customer coordinator and preparation owner.
- Relevant preparation guide and required documents.
- Actual completion date and resulting report.
- Findings and corrective actions arising from the inspection.

Track **re-inspections separately** and link them to the original inspection and applicable findings. Show whether a re-inspection is required, requested, scheduled, completed, or awaiting confirmation.

Do not assume that submitting correction evidence cancels a required re-inspection.

## 5. Inspection preparation guides

Provide property- and inspection-specific preparation guides containing:

- Documents and records to gather.
- Areas, equipment, or systems included in the inspection scope.
- Access arrangements and responsible contacts.
- Customer preparation tasks and due dates.
- Open findings from previous inspections.
- Relevant official guidance and approved company instructions.

Every guide must identify its applicable inspection type, source, owner, revision date, and review status. Technical safety instructions require qualified review.

Allow customers to assign preparation tasks and record completion. Preparation completion must remain distinct from passing an inspection.

## 6. Findings and cited violations

Clearly display each cited violation or inspection finding with:

- Unique reference number.
- Property and precise affected location.
- Inspection and report reference.
- Classification: official citation, consultant finding, internal observation, or recommendation.
- Reviewed severity and an explanation of the severity scale.
- Inspector notes, supporting photos, and relevant document references.
- Applicable cited requirement, jurisdiction, source, and verification date, when available.
- Required corrective action or a link to the approved corrective-action instructions.
- Responsible person, hard deadline, and current workflow status.
- Correction evidence, reviewer comments, and acceptance history.

Preserve the original citation and inspector record. Customers may add responses and evidence but must not silently alter the original finding.

Where a finding is disputed, show the dispute status and supporting records. A dispute must not automatically suspend a deadline.

## 7. Corrective actions and proof of correction

Provide an accessible **Submit proof of correction** action directly from each finding.

Support:

- Photos, permitted documents, completion notes, and contractor/service records.
- Multiple evidence submissions and requests for additional information.
- Submission timestamps, submitter identity, and version history.
- An assigned reviewer and visible next step.

Use a workflow such as:

**Open → Assigned → Correction in progress → Evidence submitted → Under review → Additional evidence requested or Correction verified → Closed**

Keep customer-reported completion separate from reviewer verification and any required agency acceptance.

Never close an official citation solely because a photo was uploaded or an internal reviewer marked a task complete. Record who accepted the correction, their authority, the acceptance date, and supporting evidence.

## 8. Hard deadlines and reminders

Distinguish:

- Official regulatory or agency deadlines.
- Contractual commitments.
- Internal planning targets.
- Customer-provided dates awaiting verification.

Record the original due date, source, responsible owner, and applicable time zone. Any approved extension must retain the original date and include authorization, evidence, and audit history.

Provide configurable advance reminders, due-today notices, overdue escalation, and follow-up assignments for inspections, re-inspections, corrective actions, permit expirations, and applicable credential renewals.

Clearly show whether a reminder is planned, queued, sent, delivered, or failed, based on actual evidence. Do not imply that email, SMS, push notifications, or background reminders work until those services are configured.

## 9. Permit review for projects and jobs

Provide a project/job area where customers can review potentially applicable permits.

Capture project type, property, jurisdiction, scope, planned dates, and relevant activities. Map requirements only from verified, current sources or qualified review.

For each applicable permit, show:

- Permit type and issuing authority.
- Why it may apply to the project.
- Official source and verification date.
- Required documents and responsible applicant.
- Recorded application, approval, issue, expiration, and renewal dates.
- Conditions or restrictions documented by the issuing authority.
- Application status and supporting permit documents.

Use statuses such as **Needs applicability review, Not started, In preparation, Submitted, Issued, Expired, or Denied**.

The app must not represent a project as authorized to proceed without the necessary verified approval. Do not invent permit requirements or treat a submitted application as an issued permit.

## 10. Past reports and document center

Provide a searchable archive organized by property, inspection, date, finding, and document type.

Preserve original reports and subsequent revisions. Clearly identify the current approved version while retaining historical records.

Customers should be able to move from a past report to its findings, correction evidence, verification decisions, and related re-inspection.

Protect documents with organization/property permissions. Restrict expired, superseded, or unapproved instructions appropriately without erasing their historical record.

## 11. Prevention between inspections

Help customers prevent recurrence through:

- Reviewed preventive recommendations linked to findings.
- Assigned recurring maintenance or inspection tasks.
- Relevant training needs and preparation resources.
- Root-cause and contributing-factor notes.
- Follow-up checks after corrective work.
- Identification of repeated finding categories across comparable inspections.

Separate **required corrective actions** from **recommended preventive improvements**.

Recommendations must identify their source and reviewer. Do not generate unsupported technical instructions, legal conclusions, or promises that an action guarantees compliance.

## 12. Critical tracking metrics

Maintain clear, filterable metrics for:

- Pending, active, and completed inspections or service requests.
- Critical and high-severity findings still open.
- Overdue corrective actions.
- Inspections and re-inspections due within 7, 30, and 90 days.
- Evidence submissions awaiting review.
- Median time to acknowledge, respond, correct, and verify.
- Corrections completed by the recorded deadline.
- Repeated findings, using a documented recurrence definition.
- Upcoming permit and applicable credential expirations.
- Properties with missing or stale compliance information.

Show definitions, source, reporting period, last update, denominator, and missing-data handling. Preserve zero as a measured value and distinguish it from unavailable information.

If presenting a compliance percentage, identify exactly which verified requirements it covers and show unknown or excluded requirements separately.

Charts should support action. Selecting a count or chart segment should open the underlying records.

## 13. Customer workflow

Design and demonstrate this complete workflow:

**Log in → Review portfolio status → Select property → Review upcoming inspection → Complete preparation tasks → Confirm appointment → Access inspection report → Review cited findings → Assign corrective actions → Submit proof → Respond to reviewer questions → Complete required re-inspection → Record verified closure → Track preventive follow-up and future obligations.**

At every stage, show the responsible person, current status, next action, and relevant deadline.

Include a Message Center tied to properties, inspections, findings, and projects so customers do not have to reconstruct conversations from email.

## 14. Accessibility, security, and delivery

Use responsive layouts, readable text, generous touch targets, keyboard navigation, visible focus, accessible uploads, and useful empty/error states.

Pair colors with labels and icons:

- **Red:** Reviewed critical conditions or overdue urgent actions.
- **Amber:** Action needed, approaching deadlines, or verification needed.
- **Blue:** Scheduled or in progress.
- **Green:** Verified completion within the stated scope.
- **Gray:** Missing, unavailable, or not applicable.

Support secure customer, property-manager, inspector/reviewer, coordinator, and administrator roles. Enforce organization, property, and record permissions on the server.

Persist production records securely, protect evidence uploads, maintain audit history, and clearly confirm successful saves. Support recoverable drafts and explicit offline/synchronization status where field use requires them.

If using demonstration data or simulated roles, label them prominently. Do not claim production authentication, verified compliance, notification delivery, or agency integration when unavailable.

Build on the existing customer-dashboard work in **`apps/customer-dashboard/`**. Preserve other apps and teammates’ changes. Follow repository instructions, check for conflicts before saving, and stop rather than overwrite conflicting work.

Deliver annotated screen designs, the core data model, role permissions, user workflows, metric definitions, and acceptance tests. Clearly separate functioning features, demonstrations, and externally blocked capabilities. Do not deploy publicly, submit real regulatory filings, send real customer notifications, or initiate payments during development.
