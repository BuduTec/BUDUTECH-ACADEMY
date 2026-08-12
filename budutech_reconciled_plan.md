# BuduTech Academy — Reconciled Implementation Plan

## Purpose

This plan reconciles the existing custom LMS roadmap with the BuduTech Academy build brief. The existing Manus architecture remains the technical foundation: React 19, Tailwind CSS 4, Express, tRPC, Drizzle ORM, MySQL/TiDB, Manus OAuth, and S3-backed storage. The Academy brief adds a campaign and growth layer without replacing the LMS.

The first launch is a **free live training campaign** called **Building Websites for Businesses**. The product must remain a data-driven Academy capable of supporting additional courses, paid products, cohorts, live events, replays, referrals, certificates, communications, and analytics without hardcoding the first campaign into application source code.

> Product principle: every important number must come from a source of truth, every private action must be authorized, every campaign element must be configurable, every course must be data-driven, and every referral must be traceable.

---

## Product priorities

| Priority | Release objective | Required outcome |
|---|---|---|
| 1 | Foundation | Authentication, roles, course/module/lesson hierarchy, student dashboard, and Admin CMS |
| 2 | First campaign | Dynamic event, registration, countdown, database-backed counter, YouTube Live, and replay states |
| 3 | Referral growth | Referral code, attribution, qualified referrals, student referral dashboard, leaderboard, and prize information |
| 4 | Communication | Welcome, reminders, live-now, replay, follow-up, and Admin broadcast workflows using one notification architecture |
| 5 | Monetization | Free and paid access, paid replay/product rules, payment verification, checkout, and revenue records |
| 6 | Expansion | Certificates, blog, advanced analytics, more courses, additional cohorts, and additional campaigns |

The first launch should prioritize the complete business loop over polishing every future capability: visitor registration, student account, referral sharing, attribution, ranking, event management, live session, replay state, and future conversion to paid products.

---

## Final domain model

The current schema work covers several core entities, but the brief requires two additional persisted concepts: **referral records** and **campaign competitions**. These should be added before treating the data model as complete.

| Entity | Responsibility | Important rules |
|---|---|---|
| `users` | Identity, role, referral code, and registration attribution | Referral code is unique; private fields never appear in public leaderboard responses |
| `courses` | Catalog and paid/free product metadata | Admin-created; supports draft, coming soon, published, and archived visibility |
| `courseModules` | Ordered curriculum sections | Belongs to a course and can be reordered by Admin |
| `courseLessons` | Video/text lesson content and resources | Ordered within modules; access is checked server-side |
| `trainingEvents` | Live campaigns, dates, URLs, registration, replay, and active state | Countdown and CTA states are derived from persisted time and access settings |
| `cohorts` | Time-bound student groups and capacity | Enrollment capacity and status are enforced server-side |
| `enrollments` | Student access to a course or cohort | Supports free, paid, active, completed, and refunded states as appropriate |
| `lessonProgress` | Per-student completion | A student can modify only their own progress |
| `certificates` | Completion credentials | Issued only after completion rules are satisfied |
| `waitlistEntries` | Interest capture for courses or events | Duplicate and invalid entries are handled explicitly |
| `referralRecords` | Traceable referral attribution and qualification | Stores referrer, referred user, campaign/event, status, timestamps, and qualification reason |
| `competitions` | Campaign prize and qualification configuration | Stores title, description, campaign, status, start/end, and qualification rules |
| `blogPosts` | Categorized Academy resources | Public visibility and search are data-driven |
| `emailNotifications` | Notification delivery and broadcast audit trail | Delivery failures must not corrupt enrollment or referral state |

### Referral record design

The current `users.referredByUserId` field can preserve the initial attribution shortcut, but it is not sufficient as the long-term audit trail. Add a `referralRecords` table with a unique constraint that prevents duplicate credit for the same referred registration and campaign. The table should record `referrerUserId`, `referredUserId`, optional `eventId` or `campaignId`, referral code used, status such as `pending`, `qualified`, `rejected`, or `duplicate`, qualification reason, and UTC timestamps.

The qualified-referral rule must be explicit and configurable. For the first campaign, the simplest rule is: **one valid completed registration creates one qualified referral**, subject to invalid-code, self-referral, duplicate-attribution, and fraud-review checks. If this rule changes, the Admin configuration and referral status must change rather than the frontend count.

### Event and replay design

The event object must store a canonical UTC start timestamp plus display timezone information. A separate display-only `startTime` string should not be the source of truth. The event should support registration status, capacity, live URL, replay URL, replay availability, and replay access mode such as `free`, `paid`, `restricted`, or `unavailable`. The frontend derives `upcoming`, `live`, `completed-without-replay`, and `replay-available` states from the current time and persisted configuration.

---

## Architecture and service boundaries

The platform will continue using the existing tRPC-first architecture. Backend procedures are the source of truth for access, attribution, enrollment, qualification, and Admin authorization. The browser should never calculate authoritative counts, grant access, or mutate referral totals directly.

The implementation should be split into feature routers so that `server/routers.ts` remains a composition layer rather than a monolith:

| Router | Scope |
|---|---|
| `auth` | Existing Manus authentication, session, registration attribution handoff |
| `courses` | Public catalog, course detail, module/lesson retrieval, Admin CRUD |
| `events` | Active campaign, event registration, replay access, Admin event management |
| `enrollments` | Free enrollment, paid checkout boundary, cohort capacity, waitlist, student enrollments |
| `progress` | Lesson access, completion, course completion, certificate eligibility |
| `referrals` | Referral code resolution, attribution, qualified status, leaderboard, Admin inspection |
| `blog` | Article listing, category filtering, search, and detail pages |
| `admin` | Dashboard stats, students, content, campaigns, communications, and competitions |
| `notifications` | Welcome, reminders, live/replay announcements, broadcasts, delivery logs |

Every Admin procedure must enforce the Admin role server-side. Student procedures must scope queries by the authenticated user. Public leaderboard procedures must select only safe display fields. Payment, replay, and enrollment access must be verified on the server.

---

## Release plan

### Release 1 — Foundation and CMS

First implement authentication and roles, then finish the data-driven course hierarchy. Admin must be able to create a course, modules, lessons, reorder content, publish/unpublish, feature, archive, and safely delete where allowed. Public visitors should see only appropriate course states. Students should have a protected dashboard with enrolled courses and a continue-learning path.

**Verification gate:** an Admin can create a future course without source changes; a student can see only their own private data; a visitor can browse published courses; and a lesson cannot be accessed without the required enrollment or public access rule.

### Release 2 — First live campaign

Implement the active training event, event registration, dynamic homepage campaign block, real registration count, timezone-correct countdown, live CTA, replay CTA, and unavailable-replay state. The homepage must remain Academy-first rather than permanently hardcoded around one course. Featured courses, current event, future learning opportunities, and content should be selected from data.

**Verification gate:** changing the Admin event date or YouTube URL changes the public experience without source edits; zero registrations displays a neutral state rather than a fabricated number; and event state changes correctly across upcoming, live, and replay periods.

### Release 3 — Referral growth loop

Generate a unique referral code for every registered student. Preserve a referral parameter through registration, resolve and validate the referrer server-side, prevent self-referrals and duplicate credit, and create a traceable referral record. Build the student referral panel with copy/share actions, a mobile-friendly URL, qualified count, and leaderboard position. Build a safe public leaderboard with deterministic tie handling.

**Verification gate:** a valid referred registration is attributed once; invalid, self, and duplicate cases do not increase qualified counts; public responses contain no emails, phone numbers, or internal IDs; and Admin can inspect the underlying record.

### Release 4 — Communication lifecycle

Use the existing notification architecture rather than creating a separate email system. Add templates or notification types for welcome, confirmation, reminders, 24-hour, 1-hour, live-now, replay, follow-up, relevant paid offer, and Admin broadcast messages. Scheduled reminders require a supported periodic execution strategy; do not silently implement them as in-request background work.

**Verification gate:** enrollment succeeds even if an email delivery attempt fails; every notification is logged with status; Admin broadcasts are role-protected; and scheduled work has a documented execution boundary.

### Release 5 — Monetization readiness

Keep the initial campaign free while supporting future paid courses, paid replay, and paid products. Define the checkout interface and payment verification boundary before wiring a provider. Enrollment access must be granted only after server-side verification. Revenue and payment references must come from persisted records, not simulated values.

**Verification gate:** free enrollment does not require a payment provider; paid access cannot be granted from a client-only success callback; replay access follows its configured free, paid, restricted, or unavailable rule; and analytics show unavailable rather than fake revenue where payment integration is not active.

### Release 6 — Expansion and polish

Finish certificates, blog/resources, advanced analytics, additional cohorts, additional campaigns, and visual refinement after the first campaign loop is reliable. Add search, filters, responsive improvements, accessibility review, empty states, error states, and performance checks.

**Verification gate:** browser and mobile checks cover public, student, and Admin routes, and all required tests and build checks pass before checkpoint.

---

## Frontend route map

| Route | Audience | Purpose |
|---|---|---|
| `/` | Public | Academy homepage with active campaign, featured courses, content, and CTA |
| `/courses` | Public | Dynamic course catalog with category/search filters |
| `/courses/:slug` | Public/student | Course detail, structure, access state, enrollment CTA, and student progress when enrolled |
| `/blog` | Public | Categorized and searchable resources |
| `/blog/:slug` | Public | Article detail |
| `/register` | Public | Registration with referral attribution preserved |
| `/login` | Public | Authentication entry point |
| `/dashboard` | Student | Continue learning, events, referrals, leaderboard position, announcements, certificates |
| `/learn/:courseId/:lessonId` | Student | Protected lesson player with video/text content and completion action |
| `/certificates/:code` | Public/student | Safe certificate verification and owner view/download |
| `/admin` | Admin | Unified control center |
| `/admin/courses` | Admin | Course/module/lesson CMS |
| `/admin/events` | Admin | Training event and replay configuration |
| `/admin/referrals` | Admin | Referral records, qualification, suspicious cases, leaderboard verification |
| `/admin/students` | Admin | Student, enrollment, and status management |
| `/admin/communications` | Admin | Announcements, broadcasts, and notification logs |
| `/admin/analytics` | Admin | Real-record campaign, enrollment, completion, and revenue metrics |

---

## Design direction

The interface should feel premium, modern, trustworthy, educational, and conversion-focused while remaining simple for beginners and strong on mobile. Use refined typography, generous spacing, a restrained palette, high-contrast controls, deliberate motion, and clear empty/loading/error states. The visual system must work for future courses rather than presenting the Academy as a one-course landing page.

The mobile experience is a launch requirement, not a later enhancement. Registration, course discovery, referral sharing, dashboard access, and lesson consumption should be comfortable on narrow screens. Referral sharing should support copy-to-clipboard and WhatsApp-friendly links without requiring users to compose a URL manually.

---

## Decisions required before external integrations

The following choices are intentionally unresolved by the brief and should be confirmed before implementation of those boundaries:

| Decision | Default proposal | Why it matters |
|---|---|---|
| Qualified referral | Valid completed registration, one credit per referred student per campaign | Defines leaderboard and prize outcomes |
| Attendance tracking | Not required for first campaign unless a reliable provider/event signal is chosen | Avoids claiming attendance from mere registration |
| Payment provider | Use the existing integration foundation; select provider before paid checkout implementation | Payment verification and regional currency support depend on provider |
| Email provider | Use the existing notification architecture and configure a provider before sending real mail | Avoids building a second communication system |
| Replay access | Store configurable mode per event: free, paid, restricted, or unavailable | Supports free live training and later paid replay |
| Deployment target | Manus hosting is the active project environment; map `academy.budutech.app` after the application is stable | Custom domain configuration should not block feature development |

No feature should silently assume a decision above. Until a provider is configured, the UI should show a clear unavailable or configuration-needed state instead of simulating success.

---

## Non-negotiable acceptance criteria

The first campaign is ready only when a visitor can register, obtain a student account, receive a unique referral link, share it from mobile, generate correctly attributed referrals, see qualified count and rank, and access the live/replay experience according to persisted event configuration. Admin must be able to manage the event, courses, modules, lessons, students, referrals, communications, and analytics without source-code edits.

The application must never fabricate registration totals, scarcity, rankings, testimonials, ratings, revenue, attendance, or analytics. All private actions must be authorized server-side, and public responses must expose only intentionally safe fields.

---

## Quality gates before checkpoint

The release cannot be checkpointed as complete until the repository passes strict TypeScript checks, Vitest coverage for authentication, referral attribution, enrollment, progress, and Admin authorization, a production build, browser verification of public/student/Admin routes, and mobile verification of registration, course browsing, dashboard, referral sharing, and lesson playback. The TODO file must be reviewed and every item represented as complete must have code and test evidence.

## Status

This document is the authoritative reconciled plan for the BuduTech Academy build. The repository has partial foundation work in progress, but it is not yet launch-ready. Existing implementation should be audited against the non-negotiables before further expansion, especially around fabricated fallback numbers, simulated revenue, referral traceability, event configuration, and frontend coverage.
EOF
