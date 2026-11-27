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
