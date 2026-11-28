# Build CSTC Customer Dashboard

Build a responsive **CSTC Customer Dashboard** for California Safety Training Corporation that helps customers understand their safety priorities, manage service requests, prepare for emergencies, and track important deadlines.

Inspect the repository and follow its instructions. Place this app in **`apps/customer-dashboard/`** unless an existing location is established. Preserve the Social Studio app and teammates’ work.

Review **https://www.cstcsafety.com/** before describing company offerings. Treat the customer categories below as proposed dashboard segments until CSTC confirms them. Never invent customer relationships, certifications, response guarantees, compliance requirements, or performance results.

1. **Differentiate customer types**

   Provide configurable experiences for:

   - **Commercial customers:** Businesses managing safety across workplaces, facilities, job sites, and employee teams. Emphasize incidents, training, inspections, service requests, and applicable deadlines.
   - **Municipal customers:** Public agencies or departments managing public facilities, staff preparedness, and community coordination. Support department and location views, with public-facing information kept separate from internal records.
   - **Business partners:** Authorized organizations collaborating with CSTC. Emphasize shared assignments, referrals, service coordination, documents, and response tracking. Partners should see only explicitly shared records.

   Allow organizations to belong to multiple segments. Support multiple sites and departments without mixing unrelated customers’ data.

2. **Create an organized dashboard**

   Include clear navigation for **Overview, Incident Alerts, Emergency Preparedness, Requests, Compliance Calendar, Performance, Documents, and Community Resources**.

   On the overview, prioritize:

   - Critical alerts and actions requiring attention.
   - Open emergency or urgent assistance requests.
   - Upcoming and overdue deadlines.
   - Preparedness tasks and scheduled drills.
   - Recent requests and their status.
   - Response-time summaries and relevant benchmarks.

   Every actionable item should show its status, location, responsible person, last update, and next step. Provide customer, site, department, and date filters where authorized.

3. **Incident alerts**

   Support authorized manual reporting with incident category, severity, location, occurrence time, description, assigned owner, actions taken, and supporting attachments.

   Distinguish **reported information**, **verified incidents**, and **illustrative examples**. Track acknowledgment, investigation, corrective actions, and closure history.

   Do not expose confidential incident details in public or partner views. Collect only necessary personal information.

4. **Emergency preparedness and requests**

   Provide location-specific preparedness plans, approved checklists, evacuation documents, emergency contacts, equipment checks, drill schedules, and assigned responsibilities.

   Show document owners, revision dates, and upcoming reviews. Require qualified review for technical safety instructions.

   Include an emergency assistance request form with request type, location, description, urgency, callback details, and timestamps.

   Clearly explain whether requests are monitored and during which hours. **Submitting a request must not imply that emergency services were contacted or dispatched.** Display verified, location-appropriate emergency contact options prominently.

5. **Compliance deadlines and calendar**

   Provide calendar and list views for training renewals, inspections, document reviews, permits, and other confirmed obligations.

   Each deadline must include its source, applicability, owner, due date, explicit time zone, supporting records, and verification date.

   Distinguish **regulatory obligations**, **contractual requirements**, and **internal targets**. Have authorized personnel confirm applicability before presenting a requirement as mandatory. Completing a checklist must not automatically imply legal compliance.

6. **Response times and benchmarks**

   Track request submission, acknowledgment, assignment, first response, and resolution separately.

   Explain calculations, business-hour rules, exclusions, reporting periods, and sample sizes. Distinguish contractual service commitments from internal goals.

   Use benchmarks only when their source, date, and relevance are documented. Label illustrative benchmarks clearly. Display missing data as unavailable rather than zero.

7. **Community resources**

   Provide a searchable directory of verified local emergency-management resources, public agencies, preparedness materials, and relevant CSTC resources.

   Organize resources by geography, topic, and customer type. Show source links, verification dates, and responsible maintainers. Separate official public guidance from company recommendations.

8. **Mobile accessibility and color coding**

   Make the app easy to use on phones, tablets, and computers. Use readable text, generous touch targets, accessible forms, keyboard navigation, visible focus indicators, and strong contrast.

   Use consistent status colors:

   - **Red:** Critical or immediate attention.
   - **Amber:** Warning, approaching deadline, or action needed.
   - **Green:** Completed or confirmed current.
   - **Blue:** Informational or in progress.
   - **Gray:** Unavailable, inactive, or not applicable.

   Always pair colors with written labels and icons. Define urgency separately from workflow status, and include a clear legend.

9. **Permissions, data, and delivery**

   Support authenticated CSTC administrators, coordinators, customer administrators, customer team members, and restricted partner users. Enforce organization, site, and record permissions on the server.

   Persist shared data in a database, protect uploaded documents, and audit important changes. Clearly label simulated identities and sample data.

   Start with working manual workflows. Label connected feeds and notifications operational only when configured and verified. Show data sources, update times, and stale-data warnings; do not imply real-time monitoring without a working integration.

   Test customer-data isolation, role permissions, alerts, deadlines, response calculations, request workflows, and mobile accessibility. Document completed features, startup instructions, demonstration features, and remaining integration requirements. Do not deploy publicly or send real emergency requests during development.

10. **Message Center for prospects and current clients**

    Add a clearly labeled Message Center where prospective clients can ask about CSTC offerings and current clients can ask questions or follow up on services. Treat prospect/current-client relationship separately from commercial/municipal/partner segment.

    Provide a new-inquiry form with relationship type, topic, contact name, organization, appropriate reply contact, subject and message. Offer optional related site/service references for current clients. Use conversation threads, assigned owners, follow-up dates and statuses such as New, In Progress, Awaiting Client and Closed. Support replies and a clear next action, and separate inquiry status from urgency.

    In production, give authorized CSTC staff a team inbox. Current clients may see only their permitted conversations; prospects need a secure intake and private follow-up mechanism. Never let anonymous prospects browse an inbox or let one customer see another customer's messages. Enforce permissions on the server, retain necessary audit history and timestamps, minimize personal information, and protect contact details. Validate and authorize any future attachments. Define monitoring hours and response expectations without inventing service guarantees.

    Persist production inquiries and replies in a database. Label delivery, receipt and notification status according to actual evidence; an app record is not proof that email or another channel delivered a message. Email/SMS notifications require separately configured services and recipient preferences. The Message Center is not emergency dispatch.

    In a design prototype, clearly label sample inquiries and simulated senders. Keep messages local, do not transmit real inquiries or notifications, and explain that interactions reset on reload. Test prospective and current-client inquiry creation, filtering, threads, replies, assignment, follow-up, closing/reopening, safe rendering of text, customer isolation and mobile/keyboard accessibility before claiming those capabilities operational.

11. **Invoice due dates and billing follow-up**

    Add a well-organized Invoice Due Dates section for authorized staff to monitor current-client invoices. Show invoice reference, client/organization, issue date where available, due date, currency, invoice amount, remaining balance, payment record, assigned follow-up owner and source/last-updated information. Keep invoice monitoring separate from prospect inquiries.

    Distinguish Overdue, Due Today, Upcoming, Future, Paid and Missing Due Date with color plus explicit text. Define Upcoming as a displayed, configurable interval such as the next 30 days. Calculate date-only statuses consistently in the workspace's explicit time zone, excluding paid invoices from overdue counts. Provide status/date/customer filters and overview summaries. Missing amounts and dates must remain unknown rather than zero. Do not combine currencies without a documented conversion source.

    Support authorized manual records first and an accounting integration only when connected and verified. Distinguish staff-entered paid records from accounting/payment-confirmed settlement, including partial payments and outstanding balances when implemented. Never invent CSTC pricing, payment terms, late fees, paid status or collection activity.

    Restrict staff billing controls and customer invoice views on the server. Current clients may see only their authorized invoices; prospects must not gain billing access by submitting an inquiry. Any due-date reminder service requires configuration and authorization, accurate recipients and delivery reporting. Do not send reminders, create real invoices, initiate payments or charge fees during development. Label all prototype amounts, dates and paid records illustrative and keep prototype edits local.

12. **Appointment and certification-renewal reminders**

    Add customer appointment reminders for confirmed training sessions, service visits, inspections and consultations. Record customer/site, assigned coordinator, appointment type, date, time, explicit IANA time zone and lifecycle. Disambiguate repeated local times around daylight-saving changes and reject nonexistent times. Completing, cancelling or rescheduling an appointment must cancel stale production reminder jobs.

    Add customer-specific certification/credential expiry tracking. Do not assume CSTC issues the credential, that it applies to every customer, or that a universal regulatory renewal interval exists. Record issuer, applicability, source evidence, source verification and the confirmed expiry date. Flag missing or unverified dates; do not schedule customer notifications against unverified requirements. Reminder completion is not proof of valid certification or legal compliance.

    Support editable reminder lead times such as 30, 7 and 1 days before, plus day-of when appropriate; show upcoming, due-today, overdue/follow-up-needed, missing-date and verification-needed states with an owner and next action. Keep appointment follow-up distinct from a confirmed missed appointment. Include an accurate customer-facing message preview and recipient preferences.

    Production delivery requires authenticated tenant/customer permissions, persisted records, authorized recipients, consent/preferences, a configured email/SMS service or in-app notification delivery, a durable timezone-aware scheduler, idempotency and duplicate prevention, rescheduling/cancellation, opt-out handling and delivery/failure evidence. Do not label a record Delivered merely because a job was queued. Until configured, show no outgoing delivery and distinguish local display from an operational notification service.

13. **Company-useful dashboard feature checklist**

    Use the following as the overall product acceptance list, while distinguishing prototype demonstrations from operational services:

    - Request-status counts and a bar chart for Pending, Active and Completed requests, filtered by reporting date and authorized customer/site. Pending means awaiting acknowledgment or assignment; Active means being worked on; Completed means resolved/closed. Derive metrics from request records, not decorative numbers.
    - Message Center for prospect/current-client inquiries, assignments, replies and follow-up.
    - Training and service calendar that uses the same appointment, inspection and renewal records as the reminder center; explicit timezone, category/month filters and editable linked records.
    - Deadline/reminder tracking with responsible owners, source verification, upcoming and overdue states.
    - Invoice monitoring for upcoming, due-today and overdue amounts with authorized billing follow-up.
    - Document center for approved plans, reports and training records. Require review after edits, respect recorded restrictions/expiry and permissions, and expose only authorized documents to each customer. Production requires private validated file storage; metadata placeholders are not actual approved documents.
    - Customer and site profiles containing authorized locations, contacts, relevant needs and service history.
    - Separate acknowledgment, first-response and resolution calculations from available event timestamps. Explain denominators, date range, source and elapsed/business-hour policy; missing values must not become zero. Do not fabricate benchmarks or contractual guarantees.
    - Post-service satisfaction feedback and unresolved-concern follow-up with assigned owners and lifecycle tracking.
    - Renewal and inquiry tracking for current customers' future needs and prospective business.

    Test the full flow, organization/site isolation, source applicability, document review, date/time handling, metric calculations, feedback follow-up and notification blockers. Do not present simulated role/view switching, sample sources, browser-memory records or disconnected services as production authentication, verified company facts or working integrations.
